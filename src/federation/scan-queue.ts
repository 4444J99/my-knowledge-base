import { AppError } from '../logger.js';
import { FederatedIndexer } from './indexer.js';
import { FederatedSourceRegistry } from './source-registry.js';
import { FederatedScanJobRecord, FederatedScanJobStatus, FederatedScanMode } from './types.js';

export interface FederatedScanQueueOptions {
  concurrency?: number;
}

type ActiveScanState = {
  cancelled: boolean;
};

function isFinalStatus(status: FederatedScanJobStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

function isDatabaseClosedError(error: unknown): boolean {
  return error instanceof Error && /database connection is not open/i.test(error.message);
}

export class FederatedScanQueue {
  private readonly concurrency: number;
  private readonly queuedJobIds = new Set<string>();
  private readonly activeByJobId = new Map<string, ActiveScanState>();
  private activeCount = 0;
  private pumpScheduled = false;

  constructor(
    private readonly indexer: FederatedIndexer,
    private readonly sourceRegistry: FederatedSourceRegistry,
    options: FederatedScanQueueOptions = {}
  ) {
    this.concurrency = Math.max(1, options.concurrency ?? 1);
  }

  enqueueScan(
    sourceId: string,
    options: {
      mode?: FederatedScanMode;
      requestedBy?: string | null;
      meta?: Record<string, unknown>;
    } = {}
  ): FederatedScanJobRecord {
    const source = this.sourceRegistry.getSourceById(sourceId);
    if (!source) {
      throw new AppError(`Source not found: ${sourceId}`, 'SOURCE_NOT_FOUND', 404);
    }
    if (source.status !== 'active') {
      throw new AppError(`Source is not active: ${sourceId}`, 'SOURCE_DISABLED', 400);
    }

    const activeJob = this.sourceRegistry.findActiveScanJobForSource(sourceId);
    if (activeJob) {
      return activeJob;
    }

    const job = this.sourceRegistry.createScanJob(sourceId, options);
    this.queuedJobIds.add(job.id);
    this.schedulePump();
    return job;
  }

  listJobs(options: {
    sourceId?: string;
    status?: FederatedScanJobStatus;
    limit?: number;
    offset?: number;
  } = {}): FederatedScanJobRecord[] {
    return this.sourceRegistry.listScanJobs(options);
  }

  getJob(jobId: string): FederatedScanJobRecord | undefined {
    return this.sourceRegistry.getScanJobById(jobId);
  }

  cancelJob(jobId: string, reason: string = 'Cancelled by user'): FederatedScanJobRecord {
    const job = this.sourceRegistry.getScanJobById(jobId);
    if (!job) {
      throw new AppError(`Scan job not found: ${jobId}`, 'SCAN_JOB_NOT_FOUND', 404);
    }
    if (isFinalStatus(job.status)) {
      return job;
    }

    this.queuedJobIds.delete(jobId);
    const activeState = this.activeByJobId.get(jobId);
    if (activeState) {
      activeState.cancelled = true;
    }

    return this.sourceRegistry.cancelScanJob(jobId, reason);
  }

  private schedulePump(): void {
    if (this.pumpScheduled) {
      return;
    }
    this.pumpScheduled = true;
    setImmediate(() => {
      this.pumpScheduled = false;
      void this.pump();
    });
  }

  private async pump(): Promise<void> {
    try {
      while (this.activeCount < this.concurrency) {
        const nextJobId = this.takeNextQueuedJobId();
        if (!nextJobId) {
          return;
        }

        const job = this.sourceRegistry.getScanJobById(nextJobId);
        if (!job || isFinalStatus(job.status)) {
          continue;
        }

        const started = this.sourceRegistry.startScanJob(job.id);
        if (started.status !== 'running') {
          continue;
        }

        const state: ActiveScanState = { cancelled: false };
        this.activeByJobId.set(job.id, state);
        this.activeCount += 1;

        void this.execute(job.id, started.sourceId, started.mode, state).finally(() => {
          this.activeByJobId.delete(job.id);
          this.activeCount = Math.max(0, this.activeCount - 1);
          this.schedulePump();
        });
      }
    } catch (error) {
      if (isDatabaseClosedError(error)) {
        return;
      }
      throw error;
    }
  }

  private takeNextQueuedJobId(): string | undefined {
    const iterator = this.queuedJobIds.values().next();
    if (iterator.done) return undefined;
    const jobId = iterator.value;
    this.queuedJobIds.delete(jobId);
    return jobId;
  }

  private async execute(
    jobId: string,
    sourceId: string,
    mode: FederatedScanMode,
    state: ActiveScanState
  ): Promise<void> {
    let runId: string | null = null;
    const finalizeJob = (status: 'completed' | 'failed' | 'cancelled', params: {
      runId: string | null;
      errorMessage?: string;
      meta?: Record<string, unknown>;
    }): void => {
      try {
        this.sourceRegistry.completeScanJob(jobId, {
          status,
          runId: params.runId,
          errorMessage: params.errorMessage,
          meta: params.meta,
        });
      } catch (error) {
        if (isDatabaseClosedError(error)) {
          return;
        }
        throw error;
      }
    };

    try {
      const run = await this.indexer.scanSource(sourceId, {
        mode,
        jobId,
        isCancelled: () => state.cancelled,
      });
      runId = run.id;

      if (state.cancelled) {
        finalizeJob('cancelled', {
          runId,
          errorMessage: 'Cancelled by user',
        });
        return;
      }

      finalizeJob('completed', {
        runId,
        meta: {
          runStatus: run.status,
          indexedCount: run.indexedCount,
          skippedCount: run.skippedCount,
          deletedCount: run.summary.deletedCount,
        },
      });
    } catch (error) {
      const appError = error instanceof AppError ? error : null;
      const errorRunId = (error as { runId?: string } | null)?.runId ?? null;
      runId = errorRunId ?? runId;

      if (state.cancelled || appError?.code === 'SCAN_CANCELLED') {
        finalizeJob('cancelled', {
          runId,
          errorMessage: appError?.message ?? 'Cancelled by user',
        });
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      finalizeJob('failed', {
        runId,
        errorMessage: message,
      });
    }
  }
}
