import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { verifyClosureEvidence } from './closure-evidence.js';

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(value, null, 2));
}

describe('verifyClosureEvidence', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0, tempDirs.length)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passes when staging/prod probes, release evidence, and release index linkage are present', () => {
    const root = mkdtempSync(join(tmpdir(), 'closure-evidence-pass-'));
    tempDirs.push(root);
    const probesDir = join(root, 'runtime-probes');
    const releasesDir = join(root, 'release-evidence');
    mkdirSync(probesDir, { recursive: true });
    mkdirSync(releasesDir, { recursive: true });

    const stagingName = 'staging-20260211-010101.json';
    const prodName = 'prod-20260211-010101.json';
    const stagingPath = join(probesDir, stagingName);
    const prodPath = join(probesDir, prodName);
    writeJson(stagingPath, {
      env: 'staging',
      parity: { pass: true, failures: 0 },
      strict: { pass: true, semantic503: 0, hybrid503: 0, policyDrift: 0, vectorProfileMissing: 0 },
    });
    writeJson(prodPath, {
      env: 'prod',
      parity: { pass: true, failures: 0 },
      strict: { pass: true, semantic503: 0, hybrid503: 0, policyDrift: 0, vectorProfileMissing: 0 },
    });

    const releasePath = join(releasesDir, 'v9.9.9.json');
    writeJson(releasePath, {
      tag: 'v9.9.9',
      commit: 'abc123',
      gates: { strictReadiness: 'pass', parity: 'pass' },
      runtimeVerification: {
        stagingProbeArtifact: stagingName,
        productionProbeArtifact: prodName,
      },
      reindex: { status: 'completed', mode: 'unbounded' },
    });

    const releaseIndexPath = join(root, 'RELEASE_INDEX.md');
    writeFileSync(
      releaseIndexPath,
      [
        '# Release Index',
        '',
        `- staging probe: ${stagingName}`,
        `- prod probe: ${prodName}`,
        '- unbounded reindex: completed',
      ].join('\n'),
    );

    const result = verifyClosureEvidence({
      runtimeProbesDir: probesDir,
      releaseEvidenceDir: releasesDir,
      releaseIndexPath,
      releaseTag: 'v9.9.9',
    });

    expect(result.pass).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.selected.stagingProbe?.endsWith(stagingName)).toBe(true);
    expect(result.selected.prodProbe?.endsWith(prodName)).toBe(true);
    expect(result.selected.releaseEvidence?.endsWith('v9.9.9.json')).toBe(true);
  });

  it('fails when required staging/prod probe artifacts are missing', () => {
    const root = mkdtempSync(join(tmpdir(), 'closure-evidence-fail-'));
    tempDirs.push(root);
    const probesDir = join(root, 'runtime-probes');
    const releasesDir = join(root, 'release-evidence');
    mkdirSync(probesDir, { recursive: true });
    mkdirSync(releasesDir, { recursive: true });

    writeJson(join(probesDir, 'staging-20260211-020202.json'), {
      env: 'staging',
      parity: { pass: true, failures: 0 },
      strict: { pass: true, semantic503: 0, hybrid503: 0, policyDrift: 0, vectorProfileMissing: 0 },
    });

    const result = verifyClosureEvidence({
      runtimeProbesDir: probesDir,
      releaseEvidenceDir: releasesDir,
      releaseIndexPath: join(root, 'RELEASE_INDEX.md'),
    });

    expect(result.pass).toBe(false);
    expect(result.errors.some((error) => error.includes('No prod runtime probe artifact found'))).toBe(true);
    expect(result.errors.some((error) => error.includes('No release evidence JSON found'))).toBe(true);
  });
});
