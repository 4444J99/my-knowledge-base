import { randomUUID } from 'crypto';
import Database from 'better-sqlite3';
import { AppError } from '../logger.js';
import { LocalFilesystemProvider } from './local-filesystem-provider.js';
import { FederatedSourceRegistry } from './source-registry.js';
import { FederatedScanMode, FederatedScanRunRecord, LocalFilesystemDocument } from './types.js';

type ExistingDocumentRow = {
  external_id: string;
  hash: string;
};

export interface ScanSourceOptions {
  mode?: FederatedScanMode;
  jobId?: string;
  isCancelled?: () => boolean;
}

function throwIfCancelled(isCancelled?: () => boolean): void {
  if (isCancelled?.()) {
    throw new AppError('Scan cancelled', 'SCAN_CANCELLED', 409);
  }
}

export class FederatedIndexer {
  private readonly sourceRegistry: FederatedSourceRegistry;
  private readonly localFilesystemProvider: LocalFilesystemProvider;

  constructor(
    private readonly db: Database.Database,
    sourceRegistry?: FederatedSourceRegistry,
    localFilesystemProvider?: LocalFilesystemProvider
  ) {
    this.sourceRegistry = sourceRegistry ?? new FederatedSourceRegistry(this.db);
    this.localFilesystemProvider = localFilesystemProvider ?? new LocalFilesystemProvider();
  }

  async scanSource(sourceId: string, options: ScanSourceOptions = {}): Promise<FederatedScanRunRecord> {
    const source = this.sourceRegistry.getSourceById(sourceId);
    if (!source) {
      throw new AppError(`Source not found: ${sourceId}`, 'SOURCE_NOT_FOUND', 404);
    }
    if (source.status !== 'active') {
      throw new AppError(`Source is not active: ${sourceId}`, 'SOURCE_DISABLED', 400);
    }
    if (source.kind !== 'local-filesystem') {
      throw new AppError(`Unsupported source kind: ${source.kind}`, 'UNSUPPORTED_SOURCE_KIND', 400);
    }

    throwIfCancelled(options.isCancelled);
    const run = this.sourceRegistry.createScanRun(source.id, { jobId: options.jobId });
    const mode = options.mode ?? 'incremental';

    try {
      const scannedDocuments = await this.localFilesystemProvider.scan(source, {
        mode,
        isCancelled: options.isCancelled,
      });
      throwIfCancelled(options.isCancelled);

      const summary = this.indexDocuments(source.id, scannedDocuments, {
        mode,
        isCancelled: options.isCancelled,
      });
      const runStatus = options.isCancelled?.() ? 'cancelled' : 'completed';

      this.sourceRegistry.completeScanRun(run.id, {
        status: runStatus,
        scannedCount: scannedDocuments.length,
        indexedCount: summary.indexedCount,
        skippedCount: summary.skippedCount,
        errorCount: 0,
        summary: {
          ...summary,
          mode,
          scannedCount: scannedDocuments.length,
        },
      });

      this.sourceRegistry.touchSourceScan(source.id, {
        status: runStatus,
        summary: {
          ...summary,
          mode,
          scannedCount: scannedDocuments.length,
        },
      });
    } catch (error) {
      const appError = error instanceof AppError ? error : null;
      const cancelled = appError?.code === 'SCAN_CANCELLED';
      const message = error instanceof Error ? error.message : String(error);

      this.sourceRegistry.completeScanRun(run.id, {
        status: cancelled ? 'cancelled' : 'failed',
        scannedCount: 0,
        indexedCount: 0,
        skippedCount: 0,
        errorCount: cancelled ? 0 : 1,
        errorMessage: cancelled ? undefined : message,
        summary: cancelled ? { cancelled: true, mode } : { error: message, mode },
      });
      this.sourceRegistry.touchSourceScan(source.id, {
        status: cancelled ? 'cancelled' : 'failed',
        summary: cancelled ? { cancelled: true, mode } : { error: message, mode },
      });

      if (error instanceof Error) {
        (error as { runId?: string }).runId = run.id;
      }
      throw error;
    }

    return this.sourceRegistry.getScanRunById(run.id) as FederatedScanRunRecord;
  }

  private indexDocuments(
    sourceId: string,
    scannedDocuments: LocalFilesystemDocument[],
    options: { mode: FederatedScanMode; isCancelled?: () => boolean }
  ): { indexedCount: number; skippedCount: number; deletedCount: number } {
    const existingRows = this.db
      .prepare(
        `
        SELECT external_id, hash
        FROM federated_documents
        WHERE source_id = ?
        `
      )
      .all(sourceId) as ExistingDocumentRow[];

    const existingHashByExternalId = new Map(existingRows.map((row) => [row.external_id, row.hash]));
    const remainingExternalIds = new Set(existingRows.map((row) => row.external_id));
    let indexedCount = 0;
    let skippedCount = 0;
    let deletedCount = 0;

    const upsert = this.db.prepare(
      `
      INSERT INTO federated_documents (
        id,
        source_id,
        external_id,
        path,
        title,
        content,
        hash,
        size_bytes,
        mime_type,
        modified_at,
        indexed_at,
        metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_id, external_id) DO UPDATE SET
        path = excluded.path,
        title = excluded.title,
        content = excluded.content,
        hash = excluded.hash,
        size_bytes = excluded.size_bytes,
        mime_type = excluded.mime_type,
        modified_at = excluded.modified_at,
        indexed_at = excluded.indexed_at,
        metadata = excluded.metadata
      `
    );

    const deleteByExternalId = this.db.prepare(
      `
      DELETE FROM federated_documents
      WHERE source_id = ? AND external_id = ?
      `
    );

    const transaction = this.db.transaction(() => {
      for (const doc of scannedDocuments) {
        throwIfCancelled(options.isCancelled);

        const previousHash = existingHashByExternalId.get(doc.externalId);
        remainingExternalIds.delete(doc.externalId);

        if (previousHash && previousHash === doc.hash) {
          skippedCount += 1;
          continue;
        }

        indexedCount += 1;
        upsert.run(
          randomUUID(),
          sourceId,
          doc.externalId,
          doc.path,
          doc.title,
          doc.content,
          doc.hash,
          doc.sizeBytes,
          doc.mimeType,
          doc.modifiedAt,
          new Date().toISOString(),
          JSON.stringify(doc.metadata)
        );
      }

      if (options.mode === 'full') {
        for (const externalId of remainingExternalIds) {
          throwIfCancelled(options.isCancelled);
          const result = deleteByExternalId.run(sourceId, externalId);
          deletedCount += result.changes;
        }
      }
    });

    transaction();

    return { indexedCount, skippedCount, deletedCount };
  }
}
