import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import {
  buildGitHubPagesTelemetry,
  syncGitHubPagesDirectory,
  validateGitHubPagesIndex,
} from '../src/index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readFixture(name) {
  const filePath = join(__dirname, 'fixtures', name);
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

test('validator accepts valid v2.1 fixture', () => {
  const payload = readFixture('valid-v21.json');
  const dir = mkdtempSync(join(tmpdir(), 'github-pages-core-fixture-'));
  const filePath = join(dir, 'github-pages.json');
  writeFileSync(filePath, JSON.stringify(payload, null, 2));

  const result = validateGitHubPagesIndex({ inputPath: filePath, maxAgeHours: 90000 });
  assert.equal(result.ok, true);

  rmSync(dir, { recursive: true, force: true });
});

test('validator flags stale fixture', () => {
  const payload = readFixture('stale-v21.json');
  const dir = mkdtempSync(join(tmpdir(), 'github-pages-core-fixture-'));
  const filePath = join(dir, 'github-pages.json');
  writeFileSync(filePath, JSON.stringify(payload, null, 2));

  const result = validateGitHubPagesIndex({ inputPath: filePath, maxAgeHours: 1 });
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((entry) => entry.includes('Data is stale')), true);

  rmSync(dir, { recursive: true, force: true });
});

test('sync uses fallback when fetch fails and existing file is present in non-strict mode', async () => {
  const payload = readFixture('valid-v21.json');
  const dir = mkdtempSync(join(tmpdir(), 'github-pages-core-sync-'));
  const outputPath = join(dir, 'github-pages.json');
  writeFileSync(outputPath, JSON.stringify(payload, null, 2));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('offline');
  };

  const result = await syncGitHubPagesDirectory({
    owners: ['4444J99'],
    outputPath,
    strict: false,
    logger: {
      error() {},
      warn() {},
      log() {},
      info() {},
    },
  });

  globalThis.fetch = originalFetch;

  const updated = JSON.parse(readFileSync(outputPath, 'utf-8'));
  assert.equal(result.ok, true);
  assert.equal(result.usedFallback, true);
  assert.equal(updated.syncStatus, 'fallback');

  rmSync(dir, { recursive: true, force: true });
});

test('telemetry computes budget status', () => {
  const payload = readFixture('valid-v21.json');
  const dir = mkdtempSync(join(tmpdir(), 'github-pages-core-telemetry-'));
  const filePath = join(dir, 'github-pages.json');
  writeFileSync(filePath, JSON.stringify(payload, null, 2));

  const telemetry = buildGitHubPagesTelemetry({
    inputPath: filePath,
    maxAgeHours: 90000,
    maxErrored: 8,
    maxUnreachable: 5,
  });

  assert.equal(telemetry.syncStatus, 'ok');
  assert.equal(telemetry.budgetStatus.erroredExceeded, false);
  assert.equal(telemetry.budgetStatus.unreachableExceeded, false);

  rmSync(dir, { recursive: true, force: true });
});
