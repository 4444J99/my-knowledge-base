import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { CollectionsManager } from './collections.js';
import { createCollectionsRoutes } from './collections-api.js';

describe('Collections API', () => {
  let tempDir: string;
  let dbPath: string;
  let manager: CollectionsManager;
  let app: express.Application;

  beforeEach(() => {
    tempDir = join(process.cwd(), '.test-tmp', 'collections-api');
    dbPath = join(tempDir, 'test.db');
    mkdirSync(tempDir, { recursive: true });

    manager = new CollectionsManager(dbPath);
    app = express();
    app.use(express.json());
    app.use('/api/collections', createCollectionsRoutes(manager));
  });

  afterEach(() => {
    try {
      manager.close();
    } catch {
      // ignore
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns collection stats from /api/collections/stats', async () => {
    await request(app)
      .post('/api/collections')
      .send({ name: 'Roadmap' })
      .expect(201);

    const response = await request(app)
      .get('/api/collections/stats')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.totalCollections).toBe(1);
    expect(response.body.data.totalFavorites).toBe(0);
    expect(response.body.data).toHaveProperty('avgUnitsPerCollection');
  });

  it('does not shadow /stats behind /:id route', async () => {
    const created = await request(app)
      .post('/api/collections')
      .send({ name: 'Alpha' })
      .expect(201);

    const collectionId = created.body.data.id as string;
    await request(app)
      .get('/api/collections/stats')
      .expect(200);

    const byId = await request(app)
      .get(`/api/collections/${collectionId}`)
      .expect(200);

    expect(byId.body.success).toBe(true);
    expect(byId.body.data.id).toBe(collectionId);
  });
});
