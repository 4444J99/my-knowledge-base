import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { KnowledgeDatabase } from '../src/database.js';
import { createApiRouter } from '../src/api.js';
import { CollectionsManager } from '../src/collections.js';
import { createCollectionsRoutes, createFavoritesRoutes } from '../src/collections-api.js';
import { createSavedSearchesRouter } from '../src/saved-searches-api.js';
import { WebSocketManager } from '../src/websocket-manager.js';
import { createWebSocketRoutes } from '../src/websocket-api.js';

describe('Web server API wiring', () => {
  let tempDir: string;
  let dbPath: string;
  let db: KnowledgeDatabase;
  let collectionsManager: CollectionsManager;
  let wsManager: WebSocketManager;
  let app: express.Application;

  beforeEach(() => {
    tempDir = join(process.cwd(), '.test-tmp', 'web-server-wiring');
    dbPath = join(tempDir, 'test.db');
    mkdirSync(tempDir, { recursive: true });

    db = new KnowledgeDatabase(dbPath);
    collectionsManager = new CollectionsManager(dbPath);
    wsManager = new WebSocketManager();

    app = express();
    app.use(express.json());

    // Mirror src/web-server.ts API extension mount order.
    app.use('/api/collections', createCollectionsRoutes(collectionsManager));
    app.use('/api/favorites', createFavoritesRoutes(collectionsManager));
    app.use('/api/searches', createSavedSearchesRouter(dbPath));
    app.use('/api/ws', createWebSocketRoutes(wsManager));

    // Canonical API mounted after extensions.
    app.use('/api', createApiRouter(db));
  });

  afterEach(() => {
    try {
      collectionsManager.close();
    } catch {
      // ignore
    }

    try {
      db.close();
    } catch {
      // ignore
    }

    wsManager.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('keeps /api/collections/stats reachable with extension-first mounting', async () => {
    await request(app)
      .post('/api/collections')
      .send({ name: 'Wiring Collection' })
      .expect(201);

    const response = await request(app)
      .get('/api/collections/stats')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.totalCollections).toBe(1);
  });

  it('returns JSON 404 for unknown /api routes', async () => {
    const response = await request(app)
      .get('/api/non-existent')
      .expect(404);

    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body.code).toBe('ROUTE_NOT_FOUND');
    expect(response.body.statusCode).toBe(404);
  });
});
