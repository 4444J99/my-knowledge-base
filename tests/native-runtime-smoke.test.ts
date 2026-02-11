import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import { AddressInfo } from 'net';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { KnowledgeDatabase } from '../src/database.js';
import { createApiRouter } from '../src/api.js';
import { UniverseStore } from '../src/universe/store.js';
import { MobileUniverseClient } from '../apps/mobile/src/universe-client';
import { DesktopUniverseClient } from '../apps/desktop/src/universe-client';

describe('Native runtime smoke', () => {
  let tempDir: string;
  let dbPath: string;
  let db: KnowledgeDatabase;
  let store: UniverseStore;
  let server: ReturnType<express.Application['listen']>;
  let baseUrl: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), '.test-tmp', 'native-runtime-smoke');
    dbPath = join(tempDir, 'test.db');
    mkdirSync(tempDir, { recursive: true });

    db = new KnowledgeDatabase(dbPath);
    store = new UniverseStore(db.getRawHandle());

    store.ingestNormalizedThread({
      provider: 'chatgpt',
      title: 'Native Smoke ChatGPT',
      sourcePath: 'intake/chatgpt/smoke.json',
      turns: [
        { turnIndex: 0, role: 'user', content: 'nebula question for mobile runtime' },
        { turnIndex: 1, role: 'assistant', content: 'nebula answer for mobile runtime' },
      ],
    });

    store.ingestNormalizedThread({
      provider: 'claude',
      title: 'Native Smoke Claude',
      sourcePath: 'intake/claude/smoke.json',
      turns: [
        { turnIndex: 0, role: 'user', content: 'nebula question for desktop runtime' },
        { turnIndex: 1, role: 'assistant', content: 'nebula answer for desktop runtime' },
      ],
    });

    const app = express();
    app.use(express.json());
    app.use('/api', createApiRouter(db));

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/api`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    try {
      db.close();
    } catch {
      // ignore cleanup failures
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('mobile and desktop clients can drill down and agree on universe data', async () => {
    const mobile = new MobileUniverseClient({ baseUrl });
    const desktop = new DesktopUniverseClient({ baseUrl });

    const [mobileSummary, desktopSummary] = await Promise.all([mobile.summary(), desktop.summary()]);
    expect(mobileSummary.data.chats).toBeGreaterThanOrEqual(2);
    expect(desktopSummary.data.chats).toBe(mobileSummary.data.chats);

    const providers = await mobile.providers({ limit: 10, offset: 0 });
    expect(providers.data.length).toBeGreaterThanOrEqual(2);

    const chatgpt = providers.data.find((provider) => provider.providerId === 'chatgpt');
    expect(chatgpt).toBeDefined();

    const [mobileChats, desktopChats] = await Promise.all([
      mobile.providerChats('chatgpt', { limit: 10, offset: 0 }),
      desktop.providerChats('chatgpt', { limit: 10, offset: 0 }),
    ]);
    expect(mobileChats.data.length).toBeGreaterThan(0);
    expect(desktopChats.data.length).toBe(mobileChats.data.length);

    const chatId = mobileChats.data[0].id;
    const turns = await mobile.chatTurns(chatId, { limit: 50, offset: 0 });
    expect(turns.data.length).toBeGreaterThan(0);

    const [mobileHits, desktopHits] = await Promise.all([
      mobile.termOccurrences('nebula', { limit: 50, offset: 0 }),
      desktop.termOccurrences('nebula', { limit: 50, offset: 0 }),
    ]);

    expect(mobileHits.data.length).toBeGreaterThan(0);
    expect(desktopHits.data.length).toBe(mobileHits.data.length);
  });

  it('desktop client can start reindex and fetch run status', async () => {
    const desktop = new DesktopUniverseClient({ baseUrl });
    const run = await desktop.startReindex();
    expect(run.runId.length).toBeGreaterThan(0);
    expect(run.status).toBe('running');

    const status = await desktop.reindexStatus(run.runId);
    expect(['running', 'completed', 'failed']).toContain(status.status);
  });
});

