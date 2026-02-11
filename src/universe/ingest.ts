import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, extname, relative, resolve } from 'path';
import fg from 'fast-glob';
import { ProviderImportDetector } from '../sources/providers/detector.js';
import { NormalizedConversation } from '../sources/providers/types.js';
import { UniverseStore } from './store.js';
import { IntakePolicyEngine } from './intake-policy.js';

export interface IngestOptions {
  rootDir?: string;
  limit?: number;
  save?: boolean;
  reportDir?: string;
}

export interface IngestReport {
  runId: string;
  sourceRoot: string;
  filesScanned: number;
  filesIngested: number;
  filesQuarantined: number;
  chatsIngested: number;
  turnsIngested: number;
  quarantinedFiles: Array<{ path: string; reasons: string[] }>;
  redactedFiles: Array<{ path: string; detections: number }>;
  reportPath?: string;
}

function toPairedTurns(conversation: NormalizedConversation): Array<{
  turnIndex: number;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp?: string;
  pairTurnId?: string;
  metadata?: Record<string, unknown>;
}> {
  const normalized = conversation.turns
    .filter((turn) => turn.content.trim().length > 0)
    .sort((left, right) => left.turnIndex - right.turnIndex)
    .map((turn, idx) => ({ ...turn, turnIndex: idx }));

  const result = normalized.map((turn) => ({
    turnIndex: turn.turnIndex,
    role: turn.role,
    content: turn.content,
    timestamp: turn.timestamp,
    pairTurnId: undefined,
    metadata: {
      ...(turn.metadata ?? {}),
    },
  }));

  for (let i = 0; i < result.length - 1; i++) {
    const current = result[i];
    const next = result[i + 1];
    if (current.role === 'user' && next.role === 'assistant') {
      current.metadata = { ...(current.metadata ?? {}), pairToTurnIndex: next.turnIndex };
      next.metadata = { ...(next.metadata ?? {}), pairToTurnIndex: current.turnIndex };
    }
  }

  return result;
}

export class UniverseIngestService {
  private readonly store: UniverseStore;
  private readonly detector: ProviderImportDetector;
  private readonly policy: IntakePolicyEngine;

  constructor(store: UniverseStore) {
    this.store = store;
    this.detector = new ProviderImportDetector();
    this.policy = new IntakePolicyEngine();
  }

  run(options: IngestOptions = {}): IngestReport {
    const sourceRoot = resolve(options.rootDir ?? 'intake');
    const reportRoot = resolve(options.reportDir ?? 'intake/reports');
    const save = options.save ?? false;
    const limit = options.limit ?? 5000;

    const runId = this.store.createIngestRun(sourceRoot, {
      mode: save ? 'save' : 'dry-run',
    });

    const files = fg
      .sync('**/*.{json,txt,md,markdown,html,htm}', {
        cwd: sourceRoot,
        dot: false,
        onlyFiles: true,
        followSymbolicLinks: false,
      })
      .slice(0, limit);

    let filesIngested = 0;
    let filesQuarantined = 0;
    let chatsIngested = 0;
    let turnsIngested = 0;

    const quarantinedFiles: Array<{ path: string; reasons: string[] }> = [];
    const redactedFiles: Array<{ path: string; detections: number }> = [];

    for (const relPath of files) {
      const absPath = resolve(sourceRoot, relPath);
      const rawContent = readFileSync(absPath, 'utf8');

      const policyDecision = this.policy.evaluate({
        relativePath: relPath,
        rawContent,
        bytes: Buffer.byteLength(rawContent, 'utf8'),
      });

      if (policyDecision.quarantined) {
        filesQuarantined += 1;
        quarantinedFiles.push({ path: relPath, reasons: policyDecision.reasons });
        continue;
      }

      const scanContent = policyDecision.redacted ? policyDecision.redactedContent : rawContent;
      if (policyDecision.redacted) {
        redactedFiles.push({ path: relPath, detections: policyDecision.detections.length });
      }

      const detection = this.detector.detect(relPath, scanContent);
      if (!detection.importer) {
        continue;
      }

      const conversations = detection.importer.parse(detection.context);
      if (conversations.length === 0) {
        continue;
      }

      filesIngested += 1;

      if (!save) {
        chatsIngested += conversations.length;
        turnsIngested += conversations.reduce((sum, conversation) => sum + conversation.turns.length, 0);
        continue;
      }

      for (const conversation of conversations) {
        const ingested = this.store.ingestNormalizedThread({
          provider: conversation.provider,
          providerDisplayName: conversation.provider.toUpperCase(),
          externalAccountId: conversation.externalAccountId,
          externalThreadId: conversation.externalThreadId,
          title: conversation.title,
          sourcePath: conversation.sourcePath,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          metadata: {
            ...(conversation.metadata ?? {}),
            sourceFileExtension: extname(relPath),
            sourceRelativePath: relative(sourceRoot, absPath),
            contentHash: IntakePolicyEngine.contentHash(scanContent),
          },
          turns: toPairedTurns(conversation),
        });

        chatsIngested += 1;
        turnsIngested += ingested.turns.length;
      }
    }

    const report: IngestReport = {
      runId,
      sourceRoot,
      filesScanned: files.length,
      filesIngested,
      filesQuarantined,
      chatsIngested,
      turnsIngested,
      quarantinedFiles,
      redactedFiles,
    };

    let reportPath: string | undefined;
    if (save) {
      mkdirSync(reportRoot, { recursive: true });
      reportPath = resolve(reportRoot, `universe-ingest-${runId}.json`);
      mkdirSync(dirname(reportPath), { recursive: true });
      writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      report.reportPath = reportPath;
    }

    this.store.completeIngestRun(
      runId,
      'completed',
      {
        filesScanned: report.filesScanned,
        filesIngested: report.filesIngested,
        filesQuarantined: report.filesQuarantined,
        chatsIngested: report.chatsIngested,
        turnsIngested: report.turnsIngested,
      },
      {
        policyReportPath: reportPath,
        metadata: {
          redactedFiles: redactedFiles.length,
          quarantinedFiles: quarantinedFiles.length,
        },
      },
    );

    return report;
  }
}
