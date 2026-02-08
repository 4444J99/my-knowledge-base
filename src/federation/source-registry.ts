import { randomUUID } from 'crypto';
import Database from 'better-sqlite3';
import { AppError } from '../logger.js';
import {
  CreateFederatedSourceInput,
  FederatedScanJobRecord,
  FederatedScanJobStatus,
  FederatedScanMode,
  FederatedScanRunRecord,
  FederatedScanStatus,
  FederatedSourceRecord,
  UpdateFederatedSourceInput,
} from './types.js';

type SourceRow = {
  id: string;
  name: string;
  kind: string;
  status: string;
  root_path: string;
  include_patterns: string;
  exclude_patterns: string;
  metadata: string;
  created_at: string;
  updated_at: string;
  last_scan_at: string | null;
  last_scan_status: string | null;
  last_scan_summary: string | null;
};

type ScanRunRow = {
  id: string;
  source_id: string;
  job_id: string | null;
  status: FederatedScanStatus;
  scanned_count: number;
  indexed_count: number;
  skipped_count: number;
  error_count: number;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  summary: string | null;
};

type ScanJobRow = {
  id: string;
  source_id: string;
  mode: FederatedScanMode;
  status: FederatedScanJobStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  run_id: string | null;
  requested_by: string | null;
  error_message: string | null;
  meta: string | null;
};

function parseJsonObject(value: string | null, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : fallback;
  } catch {
    return fallback;
  }
}

function parseJsonStringArray(value: string, fallback: string[] = []): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : fallback;
  } catch {
    return fallback;
  }
}

export class FederatedSourceRegistry {
  constructor(private readonly db: Database.Database) {}

  listSources(): FederatedSourceRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT *
        FROM federated_sources
        ORDER BY created_at DESC
        `
      )
      .all() as SourceRow[];

    return rows.map((row) => this.toSourceRecord(row));
  }

  getSourceById(id: string): FederatedSourceRecord | undefined {
    const row = this.db
      .prepare(
        `
        SELECT *
        FROM federated_sources
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(id) as SourceRow | undefined;

    return row ? this.toSourceRecord(row) : undefined;
  }

  createSource(input: CreateFederatedSourceInput): FederatedSourceRecord {
    if (!input.name || input.name.trim().length === 0) {
      throw new AppError('Source name is required', 'INVALID_SOURCE_NAME', 400);
    }
    if (!input.rootPath || input.rootPath.trim().length === 0) {
      throw new AppError('Source rootPath is required', 'INVALID_ROOT_PATH', 400);
    }

    const includePatterns = (input.includePatterns ?? ['**/*']).filter((entry) => entry.trim().length > 0);
    const excludePatterns = (input.excludePatterns ?? []).filter((entry) => entry.trim().length > 0);
    const now = new Date().toISOString();
    const id = randomUUID();

    this.db
      .prepare(
        `
        INSERT INTO federated_sources (
          id,
          name,
          kind,
          status,
          root_path,
          include_patterns,
          exclude_patterns,
          metadata,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        id,
        input.name.trim(),
        input.kind ?? 'local-filesystem',
        input.rootPath.trim(),
        JSON.stringify(includePatterns),
        JSON.stringify(excludePatterns),
        JSON.stringify(input.metadata ?? {}),
        now,
        now
      );

    const created = this.getSourceById(id);
    if (!created) {
      throw new AppError('Failed to create source', 'SOURCE_CREATE_FAILED', 500);
    }
    return created;
  }

  updateSource(id: string, updates: UpdateFederatedSourceInput): FederatedSourceRecord {
    const existing = this.getSourceById(id);
    if (!existing) {
      throw new AppError(`Source not found: ${id}`, 'SOURCE_NOT_FOUND', 404);
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) {
      const normalized = updates.name.trim();
      if (normalized.length === 0) {
        throw new AppError('Source name cannot be empty', 'INVALID_SOURCE_NAME', 400);
      }
      fields.push('name = ?');
      values.push(normalized);
    }

    if (updates.status !== undefined) {
      if (updates.status !== 'active' && updates.status !== 'disabled') {
        throw new AppError('Invalid source status', 'INVALID_SOURCE_STATUS', 400);
      }
      fields.push('status = ?');
      values.push(updates.status);
    }

    if (updates.rootPath !== undefined) {
      const normalized = updates.rootPath.trim();
      if (normalized.length === 0) {
        throw new AppError('Source rootPath cannot be empty', 'INVALID_ROOT_PATH', 400);
      }
      fields.push('root_path = ?');
      values.push(normalized);
    }

    if (updates.includePatterns !== undefined) {
      fields.push('include_patterns = ?');
      values.push(
        JSON.stringify(updates.includePatterns.filter((entry) => typeof entry === 'string' && entry.trim().length > 0))
      );
    }

    if (updates.excludePatterns !== undefined) {
      fields.push('exclude_patterns = ?');
      values.push(
        JSON.stringify(updates.excludePatterns.filter((entry) => typeof entry === 'string' && entry.trim().length > 0))
      );
    }

    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    if (fields.length === 0) {
      throw new AppError('No fields to update', 'NO_UPDATES', 400);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    this.db
      .prepare(
        `
        UPDATE federated_sources
        SET ${fields.join(', ')}
        WHERE id = ?
        `
      )
      .run(...values);

    return this.getSourceById(id) as FederatedSourceRecord;
  }

  createScanRun(sourceId: string, options: { jobId?: string } = {}): FederatedScanRunRecord {
    const id = randomUUID();
    const startedAt = new Date().toISOString();
    this.db
      .prepare(
        `
        INSERT INTO federated_scan_runs (
          id,
          source_id,
          job_id,
          status,
          scanned_count,
          indexed_count,
          skipped_count,
          error_count,
          started_at,
          summary
        )
        VALUES (?, ?, ?, 'running', 0, 0, 0, 0, ?, '{}')
        `
      )
      .run(id, sourceId, options.jobId ?? null, startedAt);

    return this.getScanRunById(id) as FederatedScanRunRecord;
  }

  completeScanRun(
    runId: string,
    update: {
      status: Exclude<FederatedScanStatus, 'running'>;
      scannedCount: number;
      indexedCount: number;
      skippedCount: number;
      errorCount: number;
      summary?: Record<string, unknown>;
      errorMessage?: string;
    }
  ): FederatedScanRunRecord {
    const completedAt = new Date().toISOString();
    this.db
      .prepare(
        `
        UPDATE federated_scan_runs
        SET
          status = ?,
          scanned_count = ?,
          indexed_count = ?,
          skipped_count = ?,
          error_count = ?,
          completed_at = ?,
          error_message = ?,
          summary = ?
        WHERE id = ?
        `
      )
      .run(
        update.status,
        update.scannedCount,
        update.indexedCount,
        update.skippedCount,
        update.errorCount,
        completedAt,
        update.errorMessage ?? null,
        JSON.stringify(update.summary ?? {}),
        runId
      );

    return this.getScanRunById(runId) as FederatedScanRunRecord;
  }

  getScanRunById(runId: string): FederatedScanRunRecord | undefined {
    const row = this.db
      .prepare(
        `
        SELECT *
        FROM federated_scan_runs
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(runId) as ScanRunRow | undefined;
    return row ? this.toScanRunRecord(row) : undefined;
  }

  listScanRuns(sourceId: string, limit: number = 20): FederatedScanRunRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT *
        FROM federated_scan_runs
        WHERE source_id = ?
        ORDER BY started_at DESC
        LIMIT ?
        `
      )
      .all(sourceId, limit) as ScanRunRow[];
    return rows.map((row) => this.toScanRunRecord(row));
  }

  touchSourceScan(
    sourceId: string,
    update: { status: Exclude<FederatedScanStatus, 'running'>; summary?: Record<string, unknown> }
  ): FederatedSourceRecord {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `
        UPDATE federated_sources
        SET
          last_scan_at = ?,
          last_scan_status = ?,
          last_scan_summary = ?,
          updated_at = ?
        WHERE id = ?
        `
      )
      .run(now, update.status, JSON.stringify(update.summary ?? {}), now, sourceId);
    return this.getSourceById(sourceId) as FederatedSourceRecord;
  }

  createScanJob(
    sourceId: string,
    options: { mode?: FederatedScanMode; requestedBy?: string | null; meta?: Record<string, unknown> } = {}
  ): FederatedScanJobRecord {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    this.db
      .prepare(
        `
        INSERT INTO federated_scan_jobs (
          id,
          source_id,
          mode,
          status,
          created_at,
          requested_by,
          meta
        )
        VALUES (?, ?, ?, 'queued', ?, ?, ?)
        `
      )
      .run(
        id,
        sourceId,
        options.mode ?? 'incremental',
        createdAt,
        options.requestedBy ?? null,
        JSON.stringify(options.meta ?? {})
      );

    return this.getScanJobById(id) as FederatedScanJobRecord;
  }

  getScanJobById(jobId: string): FederatedScanJobRecord | undefined {
    const row = this.db
      .prepare(
        `
        SELECT *
        FROM federated_scan_jobs
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(jobId) as ScanJobRow | undefined;

    return row ? this.toScanJobRecord(row) : undefined;
  }

  listScanJobs(options: {
    sourceId?: string;
    status?: FederatedScanJobStatus;
    limit?: number;
    offset?: number;
  } = {}): FederatedScanJobRecord[] {
    const whereParts: string[] = [];
    const params: unknown[] = [];

    if (options.sourceId) {
      whereParts.push('source_id = ?');
      params.push(options.sourceId);
    }

    if (options.status) {
      whereParts.push('status = ?');
      params.push(options.status);
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
    const limit = Math.max(1, Math.min(200, options.limit ?? 50));
    const offset = Math.max(0, options.offset ?? 0);

    const rows = this.db
      .prepare(
        `
        SELECT *
        FROM federated_scan_jobs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        `
      )
      .all(...params, limit, offset) as ScanJobRow[];

    return rows.map((row) => this.toScanJobRecord(row));
  }

  findActiveScanJobForSource(sourceId: string): FederatedScanJobRecord | undefined {
    const row = this.db
      .prepare(
        `
        SELECT *
        FROM federated_scan_jobs
        WHERE source_id = ?
          AND status IN ('queued', 'running')
        ORDER BY created_at DESC
        LIMIT 1
        `
      )
      .get(sourceId) as ScanJobRow | undefined;

    return row ? this.toScanJobRecord(row) : undefined;
  }

  startScanJob(jobId: string): FederatedScanJobRecord {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `
        UPDATE federated_scan_jobs
        SET
          status = 'running',
          started_at = COALESCE(started_at, ?),
          error_message = NULL
        WHERE id = ?
          AND status = 'queued'
        `
      )
      .run(now, jobId);

    const job = this.getScanJobById(jobId);
    if (!job) {
      throw new AppError(`Scan job not found: ${jobId}`, 'SCAN_JOB_NOT_FOUND', 404);
    }
    return job;
  }

  completeScanJob(
    jobId: string,
    update: {
      status: Exclude<FederatedScanJobStatus, 'queued' | 'running'>;
      runId?: string | null;
      errorMessage?: string | null;
      meta?: Record<string, unknown>;
    }
  ): FederatedScanJobRecord {
    const now = new Date().toISOString();
    const current = this.getScanJobById(jobId);
    if (!current) {
      throw new AppError(`Scan job not found: ${jobId}`, 'SCAN_JOB_NOT_FOUND', 404);
    }

    const mergedMeta = {
      ...current.meta,
      ...(update.meta ?? {}),
    };

    this.db
      .prepare(
        `
        UPDATE federated_scan_jobs
        SET
          status = ?,
          completed_at = ?,
          run_id = COALESCE(?, run_id),
          error_message = ?,
          meta = ?
        WHERE id = ?
        `
      )
      .run(update.status, now, update.runId ?? null, update.errorMessage ?? null, JSON.stringify(mergedMeta), jobId);

    return this.getScanJobById(jobId) as FederatedScanJobRecord;
  }

  cancelScanJob(jobId: string, reason: string = 'Cancelled by user'): FederatedScanJobRecord {
    const existing = this.getScanJobById(jobId);
    if (!existing) {
      throw new AppError(`Scan job not found: ${jobId}`, 'SCAN_JOB_NOT_FOUND', 404);
    }
    if (existing.status === 'completed' || existing.status === 'failed' || existing.status === 'cancelled') {
      return existing;
    }

    const now = new Date().toISOString();
    this.db
      .prepare(
        `
        UPDATE federated_scan_jobs
        SET
          status = 'cancelled',
          completed_at = ?,
          error_message = ?,
          meta = ?
        WHERE id = ?
        `
      )
      .run(
        now,
        reason,
        JSON.stringify({
          ...existing.meta,
          cancelledAt: now,
        }),
        jobId
      );

    return this.getScanJobById(jobId) as FederatedScanJobRecord;
  }

  private toSourceRecord(row: SourceRow): FederatedSourceRecord {
    return {
      id: row.id,
      name: row.name,
      kind: row.kind as FederatedSourceRecord['kind'],
      status: row.status as FederatedSourceRecord['status'],
      rootPath: row.root_path,
      includePatterns: parseJsonStringArray(row.include_patterns, ['**/*']),
      excludePatterns: parseJsonStringArray(row.exclude_patterns, []),
      metadata: parseJsonObject(row.metadata),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastScanAt: row.last_scan_at ?? undefined,
      lastScanStatus: (row.last_scan_status as FederatedSourceRecord['lastScanStatus']) ?? undefined,
      lastScanSummary: parseJsonObject(row.last_scan_summary, {}),
    };
  }

  private toScanRunRecord(row: ScanRunRow): FederatedScanRunRecord {
    return {
      id: row.id,
      sourceId: row.source_id,
      jobId: row.job_id,
      status: row.status,
      scannedCount: row.scanned_count,
      indexedCount: row.indexed_count,
      skippedCount: row.skipped_count,
      errorCount: row.error_count,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      errorMessage: row.error_message,
      summary: parseJsonObject(row.summary),
    };
  }

  private toScanJobRecord(row: ScanJobRow): FederatedScanJobRecord {
    return {
      id: row.id,
      sourceId: row.source_id,
      mode: row.mode,
      status: row.status,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      runId: row.run_id,
      requestedBy: row.requested_by,
      errorMessage: row.error_message,
      meta: parseJsonObject(row.meta, {}),
    };
  }
}
