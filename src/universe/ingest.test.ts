import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { KnowledgeDatabase } from '../database.js';
import { UniverseStore } from './store.js';
import { UniverseIngestService } from './ingest.js';

function writeFixture(baseDir: string, relativePath: string, content: string): void {
  const fullPath = join(baseDir, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, 'utf8');
}

describe('UniverseIngestService', () => {
  let tempDir: string;
  let intakeDir: string;
  let reportDir: string;
  let dbPath: string;
  let db: KnowledgeDatabase;
  let store: UniverseStore;
  let ingest: UniverseIngestService;

  beforeEach(() => {
    tempDir = join(process.cwd(), '.test-tmp', 'universe-ingest');
    intakeDir = join(tempDir, 'intake');
    reportDir = join(tempDir, 'reports');
    dbPath = join(tempDir, 'knowledge.db');

    mkdirSync(intakeDir, { recursive: true });

    writeFixture(
      intakeDir,
      'chatgpt/chat.html',
      `<!doctype html>
<html>
  <head><title>ChatGPT Nebula Thread</title></head>
  <body>
    <div data-message-author-role="user">Find nebula signals in all providers.</div>
    <div data-message-author-role="assistant">Use term occurrence indexing for nebula.</div>
  </body>
</html>`,
    );

    writeFixture(
      intakeDir,
      'claude/export.json',
      JSON.stringify([
        {
          uuid: 'claude-thread-1',
          name: 'Claude Nebula Thread',
          chat_messages: [
            { uuid: 'c1', sender: 'human', text: 'Track nebula topic drift.' },
            { uuid: 'c2', sender: 'assistant', text: 'Compare nebula contexts across chats.' },
          ],
        },
      ]),
    );

    writeFixture(
      intakeDir,
      'gemini/export.json',
      JSON.stringify({
        conversations: [
          {
            id: 'gemini-thread-1',
            title: 'Gemini Nebula Thread',
            messages: [
              { role: 'user', text: 'Show nebula ranking parity checks.' },
              { role: 'model', text: 'Run shared query sets over both endpoints.' },
            ],
          },
        ],
      }),
    );

    writeFixture(
      intakeDir,
      'grok/session.md',
      `# Grok Session
User: Map nebula motifs in graph edges.
Assistant: Build cooccurrence links and inspect weights.
`,
    );

    writeFixture(
      intakeDir,
      'copilot/exchanges.json',
      JSON.stringify({
        threadId: 'copilot-thread-1',
        title: 'Copilot Nebula Thread',
        exchanges: [
          {
            prompt: 'How do we verify nebula term coverage?',
            response: 'Use /api/universe/terms/:term/occurrences and sample spot-checks.',
          },
        ],
      }),
    );

    writeFixture(intakeDir, 'artifacts/secrets/private.txt', 'api_key = super-sensitive-token-value'); // allow-secret (intentional redaction test fixture)

    db = new KnowledgeDatabase(dbPath);
    store = new UniverseStore(db.getRawHandle());
    ingest = new UniverseIngestService(store);
  });

  afterEach(() => {
    try {
      db.close();
    } catch {
      // no-op
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('ingests mixed provider archives with policy quarantine and report output', () => {
    const report = ingest.run({
      rootDir: intakeDir,
      save: true,
      reportDir,
      limit: 50,
    });

    expect(report.filesScanned).toBeGreaterThanOrEqual(6);
    expect(report.filesQuarantined).toBe(1);
    expect(report.chatsIngested).toBeGreaterThanOrEqual(5);
    expect(report.turnsIngested).toBeGreaterThanOrEqual(10);
    expect(report.reportPath).toBeDefined();
    expect(existsSync(report.reportPath!)).toBe(true);

    const summary = store.getUniverseSummary();
    expect(summary.providers).toBeGreaterThanOrEqual(5);
    expect(summary.chats).toBeGreaterThanOrEqual(5);
    expect(summary.turns).toBeGreaterThanOrEqual(10);
    expect(summary.occurrences).toBeGreaterThan(0);

    const nebula = store.findTermOccurrences('nebula', 100, 0);
    expect(nebula.total).toBeGreaterThan(0);

    const parallel = store.listParallelNetworks(50, 1);
    expect(parallel.length).toBeGreaterThan(0);

    const run = store.getIngestRun(report.runId);
    expect(run).toBeDefined();
    expect(run?.status).toBe('completed');
  });
});
