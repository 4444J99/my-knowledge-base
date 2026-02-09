import { describe, expect, it } from 'vitest';
import { join } from 'path';
import { createApiRouter } from './api.js';
import { KnowledgeDatabase } from './database.js';
import { createTestTempDir, cleanupTestTempDir } from './test-utils/temp-paths.js';

describe('API auth configuration', () => {
  it('requires JWT_SECRET when ENABLE_AUTH=true', () => {
    const originalEnableAuth = process.env.ENABLE_AUTH;
    const originalJwtSecret = process.env.JWT_SECRET;
    const tempDir = createTestTempDir('api-auth-config');
    const dbPath = join(tempDir, 'test.db');
    const db = new KnowledgeDatabase(dbPath);

    process.env.ENABLE_AUTH = 'true';
    delete process.env.JWT_SECRET;

    try {
      expect(() => createApiRouter(db)).toThrow(/JWT_SECRET is required/);
    } finally {
      db.close();
      cleanupTestTempDir(tempDir);
      if (originalEnableAuth === undefined) {
        delete process.env.ENABLE_AUTH;
      } else {
        process.env.ENABLE_AUTH = originalEnableAuth;
      }
      if (originalJwtSecret === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = originalJwtSecret;
      }
    }
  });
});
