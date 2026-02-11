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
    const reindexDir = join(root, 'reindex-runs');
    const alertsDir = join(root, 'alert-verification');
    mkdirSync(probesDir, { recursive: true });
    mkdirSync(releasesDir, { recursive: true });
    mkdirSync(reindexDir, { recursive: true });
    mkdirSync(alertsDir, { recursive: true });

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
    const reindexPath = join(reindexDir, 'prod-unbounded-20260211.json');
    writeJson(reindexPath, {
      env: 'prod',
      pass: true,
      runId: 'run-1',
      run: {
        status: 'completed',
        chatsIngested: 5,
        turnsIngested: 50,
      },
    });
    const alertEvidencePath = join(alertsDir, 'latest.json');
    writeJson(alertEvidencePath, {
      generatedAt: '2026-02-11T10:00:00.000Z',
      verifiedAlertIds: [
        'api-5xx-spike-critical',
        'db-sqlite-busy-warning',
      ],
    });
    writeJson(releasePath, {
      tag: 'v9.9.9',
      commit: 'abc123',
      gates: { strictReadiness: 'pass', paritySmoke: 'pass' },
      runtimeVerification: {
        stagingProbeArtifact: stagingName,
        productionProbeArtifact: prodName,
      },
      observability: {
        alertVerificationArtifact: alertEvidencePath,
      },
      reindex: {
        status: 'completed',
        mode: 'unbounded',
        evidence: reindexPath,
      },
    });

    const releaseIndexPath = join(root, 'RELEASE_INDEX.md');
    writeFileSync(
      releaseIndexPath,
      [
        '# Release Index',
        '',
        `- staging probe: ${stagingName}`,
        `- prod probe: ${prodName}`,
        `- unbounded reindex: ${reindexPath}`,
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
    expect(result.selected.reindexEvidence?.endsWith('prod-unbounded-20260211.json')).toBe(true);
    expect(result.selected.alertEvidence?.endsWith('latest.json')).toBe(true);
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

  it('fails when release evidence reindex reference is pending', () => {
    const root = mkdtempSync(join(tmpdir(), 'closure-evidence-pending-'));
    tempDirs.push(root);
    const probesDir = join(root, 'runtime-probes');
    const releasesDir = join(root, 'release-evidence');
    mkdirSync(probesDir, { recursive: true });
    mkdirSync(releasesDir, { recursive: true });

    const stagingName = 'staging-20260211-030303.json';
    const prodName = 'prod-20260211-030303.json';
    writeJson(join(probesDir, stagingName), {
      env: 'staging',
      parity: { pass: true, failures: 0 },
      strict: { pass: true, semantic503: 0, hybrid503: 0, policyDrift: 0, vectorProfileMissing: 0 },
    });
    writeJson(join(probesDir, prodName), {
      env: 'prod',
      parity: { pass: true, failures: 0 },
      strict: { pass: true, semantic503: 0, hybrid503: 0, policyDrift: 0, vectorProfileMissing: 0 },
    });

    writeJson(join(releasesDir, 'v9.9.8.json'), {
      tag: 'v9.9.8',
      commit: 'abc124',
      gates: { strictReadiness: 'pass', paritySmoke: 'pass' },
      runtimeVerification: {
        stagingProbeArtifact: stagingName,
        productionProbeArtifact: prodName,
      },
      observability: {
        alertVerificationArtifact: 'missing',
      },
      reindex: {
        evidence: 'pending: reindex evidence upload',
      },
    });

    const releaseIndexPath = join(root, 'RELEASE_INDEX.md');
    writeFileSync(
      releaseIndexPath,
      [
        '# Release Index',
        '',
        `- staging probe: ${stagingName}`,
        `- prod probe: ${prodName}`,
        '- reindex: pending',
      ].join('\n'),
    );

    const result = verifyClosureEvidence({
      runtimeProbesDir: probesDir,
      releaseEvidenceDir: releasesDir,
      releaseIndexPath,
      releaseTag: 'v9.9.8',
    });

    expect(result.pass).toBe(false);
    expect(result.errors.some((error) => error.includes('reindex reference is pending'))).toBe(true);
    expect(
      result.errors.some((error) => error.includes('missing observability.alertVerificationArtifact')),
    ).toBe(true);
  });
});
