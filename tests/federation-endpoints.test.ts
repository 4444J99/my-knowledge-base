import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createApiRouter } from '../src/api.js';
import { KnowledgeDatabase } from '../src/database.js';
import { cleanupTestTempDir, createTestTempDir } from '../src/test-utils/temp-paths.js';

type FederatedScanJob = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  mode: 'incremental' | 'full';
  sourceId: string;
};

async function waitForJobFinalState(
  app: express.Application,
  jobId: string,
  timeoutMs: number = 10_000
): Promise<FederatedScanJob> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const response = await request(app).get(`/api/federation/jobs/${jobId}`).expect(200);
    const job = response.body.data as FederatedScanJob;
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 75));
  }

  throw new Error(`Timed out waiting for job ${jobId} to reach final state`);
}

describe('Federation API Endpoints', () => {
  let tempDir: string;
  let sourceDir: string;
  let db: KnowledgeDatabase;
  let app: express.Application;
  let originalAllowedRoots: string | undefined;

  beforeEach(() => {
    tempDir = createTestTempDir('federation-api');
    sourceDir = join(tempDir, 'source-docs');
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(join(sourceDir, 'guide.md'), '# OAuth Guide\n\nImplement OAuth with PKCE.');
    writeFileSync(join(sourceDir, 'notes.txt'), 'Deployment checklist and rollback notes.');

    originalAllowedRoots = process.env.FEDERATION_ALLOWED_ROOTS;
    process.env.FEDERATION_ALLOWED_ROOTS = sourceDir;

    db = new KnowledgeDatabase(join(tempDir, 'test.db'));
    app = express();
    app.use(express.json());
    app.use('/api', createApiRouter(db));
  });

  afterEach(() => {
    try {
      db.close();
    } catch {
      // already closed
    }
    if (originalAllowedRoots === undefined) {
      delete process.env.FEDERATION_ALLOWED_ROOTS;
    } else {
      process.env.FEDERATION_ALLOWED_ROOTS = originalAllowedRoots;
    }
    cleanupTestTempDir(tempDir);
  });

  it('registers and lists federated sources', async () => {
    const createResponse = await request(app).post('/api/federation/sources').send({
      name: 'Local Docs',
      rootPath: sourceDir,
      includePatterns: ['**/*.md', '**/*.txt'],
      excludePatterns: ['**/.git/**'],
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.name).toBe('Local Docs');
    expect(createResponse.body.data.status).toBe('active');

    const listResponse = await request(app).get('/api/federation/sources').expect(200);
    expect(listResponse.body.success).toBe(true);
    expect(Array.isArray(listResponse.body.data)).toBe(true);
    expect(listResponse.body.data.length).toBe(1);
    expect(listResponse.body.data[0].rootPath).toBe(sourceDir);
  });

  it('queues and completes a scan job, then returns filtered search results', async () => {
    const createResponse = await request(app).post('/api/federation/sources').send({
      name: 'Engineering Docs',
      rootPath: sourceDir,
      includePatterns: ['**/*.md', '**/*.txt'],
    });
    const sourceId = createResponse.body.data.id as string;

    const scanResponse = await request(app).post(`/api/federation/sources/${sourceId}/scan`).send({ mode: 'full' }).expect(202);
    expect(scanResponse.body.success).toBe(true);
    expect(['queued', 'running', 'completed']).toContain(scanResponse.body.data.status);

    const finalJob = await waitForJobFinalState(app, scanResponse.body.data.id as string);
    expect(finalJob.status).toBe('completed');
    expect(finalJob.mode).toBe('full');

    const jobsResponse = await request(app).get('/api/federation/jobs').query({ sourceId }).expect(200);
    expect(jobsResponse.body.success).toBe(true);
    expect(jobsResponse.body.data.length).toBeGreaterThan(0);
    expect(jobsResponse.body.data[0].sourceId).toBe(sourceId);

    const scansResponse = await request(app).get(`/api/federation/sources/${sourceId}/scans`).expect(200);
    expect(scansResponse.body.success).toBe(true);
    expect(scansResponse.body.data.length).toBeGreaterThan(0);
    expect(scansResponse.body.data[0].sourceId).toBe(sourceId);
    expect(scansResponse.body.data[0].jobId).toBe(finalJob.id);

    const searchResponse = await request(app)
      .get('/api/federation/search')
      .query({
        q: 'OAuth',
        sourceId,
        mimeType: 'text/markdown',
        pathPrefix: 'guide',
      })
      .expect(200);

    expect(searchResponse.body.success).toBe(true);
    expect(Array.isArray(searchResponse.body.data)).toBe(true);
    expect(searchResponse.body.data.length).toBeGreaterThan(0);
    expect(searchResponse.body.data.some((entry: any) => entry.path.includes('guide.md'))).toBe(true);
    expect(typeof searchResponse.body.data[0].score).toBe('number');
  });

  it('cancels queued or running jobs', async () => {
    for (let i = 0; i < 150; i += 1) {
      writeFileSync(join(sourceDir, `bulk-${i}.txt`), `line-${i}\n`.repeat(400));
    }

    const createResponse = await request(app).post('/api/federation/sources').send({
      name: 'Cancelable Source',
      rootPath: sourceDir,
      includePatterns: ['**/*.txt'],
    });
    const sourceId = createResponse.body.data.id as string;

    const scanResponse = await request(app).post(`/api/federation/sources/${sourceId}/scan`).send({ mode: 'full' }).expect(202);
    const jobId = scanResponse.body.data.id as string;

    await request(app).post(`/api/federation/jobs/${jobId}/cancel`).expect(200);
    const finalJob = await waitForJobFinalState(app, jobId);
    expect(finalJob.status).toBe('cancelled');
  });

  it('blocks source registration outside allowed federation roots', async () => {
    const disallowedPath = join(tempDir, 'outside-root');
    mkdirSync(disallowedPath, { recursive: true });

    const response = await request(app).post('/api/federation/sources').send({
      name: 'Blocked Source',
      rootPath: disallowedPath,
    });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FEDERATION_ROOT_NOT_ALLOWED');
  });

  it('requires search query for federated search', async () => {
    const response = await request(app).get('/api/federation/search').expect(400);
    expect(response.body.code).toBe('MISSING_QUERY');
  });
});
