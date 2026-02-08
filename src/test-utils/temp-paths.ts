import { randomUUID } from 'crypto';
import { mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';

const TEST_TMP_ROOT = resolve(process.cwd(), '.test-tmp');

export function createTestTempDir(scope: string): string {
  const dir = join(TEST_TMP_ROOT, scope, randomUUID());
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function cleanupTestTempDir(dir: string): void {
  const target = resolve(dir);
  if (!target.startsWith(TEST_TMP_ROOT)) {
    throw new Error(`Refusing to delete non-test path: ${target}`);
  }
  rmSync(target, { recursive: true, force: true });
}
