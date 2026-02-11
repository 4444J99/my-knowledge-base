import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { KnowledgeDatabase } from '../database.js';
import { createApiRouter } from '../api.js';
import { UniverseStore } from './store.js';

describe('Universe API', () => {
  let tempDir: string;
  let dbPath: string;
  let db: KnowledgeDatabase;
  let app: express.Application;
  let store: UniverseStore;

  beforeEach(() => {
    tempDir = join(process.cwd(), '.test-tmp', 'universe-api');
    dbPath = join(tempDir, 'test.db');
    mkdirSync(tempDir, { recursive: true });

    db = new KnowledgeDatabase(dbPath);
    store = new UniverseStore(db.getRawHandle());

    const alpha = store.ingestNormalizedThread({
      provider: 'chatgpt',
      title: 'Alpha Thread',
      sourcePath: 'intake/chatgpt/alpha.json',
      turns: [
        { turnIndex: 0, role: 'user', content: 'alpha beta shared token' },
        { turnIndex: 1, role: 'assistant', content: 'response with shared token and map' },
      ],
    });

    store.ingestNormalizedThread({
      provider: 'claude',
      title: 'Beta Thread',
      sourcePath: 'intake/claude/beta.json',
      turns: [
        { turnIndex: 0, role: 'user', content: 'beta gamma shared token' },
        { turnIndex: 1, role: 'assistant', content: 'another response referencing token' },
      ],
    });

    app = express();
    app.use(express.json());
    app.use('/api', createApiRouter(db));
  });

  afterEach(() => {
    try {
      db.close();
    } catch {
      // ignore
    }

    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('returns universe summary', async () => {
    const response = await request(app).get('/api/universe/summary').expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.providers).toBeGreaterThanOrEqual(2);
    expect(response.body.data.chats).toBeGreaterThanOrEqual(2);
    expect(response.body.data.turns).toBeGreaterThanOrEqual(4);
  });

  it('lists provider chats and chat turns', async () => {
    const providers = await request(app).get('/api/universe/providers').expect(200);
    const chatgpt = providers.body.data.find((row: any) => row.providerId === 'chatgpt');
    expect(chatgpt).toBeDefined();

    const chats = await request(app)
      .get('/api/universe/providers/chatgpt/chats')
      .expect(200);

    expect(chats.body.data.length).toBeGreaterThan(0);
    const chatId = chats.body.data[0].id;

    const chat = await request(app).get(`/api/universe/chats/${chatId}`).expect(200);
    expect(chat.body.data.id).toBe(chatId);

    const turns = await request(app).get(`/api/universe/chats/${chatId}/turns`).expect(200);
    expect(turns.body.data.length).toBeGreaterThan(0);
    expect(turns.body.data[0]).toHaveProperty('role');
  });

  it('supports deterministic pagination on providers', async () => {
    const pageOne = await request(app).get('/api/universe/providers?limit=1&offset=0').expect(200);
    const pageTwo = await request(app).get('/api/universe/providers?limit=1&offset=1').expect(200);

    expect(pageOne.body.pagination.limit).toBe(1);
    expect(pageTwo.body.pagination.offset).toBe(1);
    expect(pageOne.body.data.length).toBe(1);
    expect(pageTwo.body.data.length).toBe(1);
    expect(pageOne.body.data[0].id).not.toBe(pageTwo.body.data[0].id);
  });

  it('resolves global term occurrences', async () => {
    const response = await request(app)
      .get('/api/universe/terms/shared/occurrences?limit=20')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    const providers = new Set(response.body.data.map((item: any) => item.providerId));
    expect(providers.has('chatgpt')).toBe(true);
    expect(providers.has('claude')).toBe(true);
  });

  it('returns cooccurrence network edges', async () => {
    const providers = await request(app).get('/api/universe/providers').expect(200);
    const chatgpt = providers.body.data.find((row: any) => row.providerId === 'chatgpt');
    expect(chatgpt).toBeDefined();

    const chats = await request(app)
      .get('/api/universe/providers/chatgpt/chats')
      .expect(200);

    const chatId = chats.body.data[0].id;
    const network = await request(app)
      .get(`/api/universe/chats/${chatId}/network`)
      .expect(200);

    expect(network.body.success).toBe(true);
    expect(Array.isArray(network.body.data)).toBe(true);
    expect(network.body.data.length).toBeGreaterThan(0);
  });

  it('validates network query parameters', async () => {
    await request(app)
      .get('/api/universe/networks/parallel?minWeight=-1')
      .expect(400);
  });

  it('returns not-found for missing chats and runs', async () => {
    await request(app).get('/api/universe/chats/does-not-exist').expect(404);
    await request(app).get('/api/universe/reindex/does-not-exist').expect(404);
  });

  it('runs reindex and reports run state', async () => {
    const start = await request(app).post('/api/universe/reindex').expect(202);
    const runId = start.body.data.runId;

    let run: any = null;
    for (let i = 0; i < 20; i++) {
      run = await request(app).get(`/api/universe/reindex/${runId}`).expect(200);
      if (run.body.data.status !== 'running') {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    expect(run).not.toBeNull();
    expect(run!.body.data.status === 'completed' || run!.body.data.status === 'failed').toBe(true);
  });
});
