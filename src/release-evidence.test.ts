import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import { afterEach, describe, expect, it } from 'vitest';
import { generateReleaseEvidence } from './release-evidence.js';

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

describe('generateReleaseEvidence', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0, roots.length)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('writes release evidence and upserts runtime ledger in release index', () => {
    const root = mkdtempSync(join(tmpdir(), 'release-evidence-'));
    roots.push(root);
    const probesDir = join(root, 'runtime-probes');
    const evidenceDir = join(root, 'release-evidence');
    const reindexDir = join(root, 'reindex-runs');
    const alertsDir = join(root, 'alert-verification');
    const indexPath = join(root, 'RELEASE_INDEX.md');
    writeFileSync(indexPath, '# Release Index\n\n## Active Release Line\n\nplaceholder\n', 'utf8');

    const timestamp = '2026-02-11T10:00:00.000Z';
    writeJson(join(probesDir, 'staging-20260211-100000.json'), {
      env: 'staging',
      pass: true,
      parity: { pass: true, failures: 0, queryCount: 5 },
      strict: {
        pass: true,
        semantic503: 0,
        hybrid503: 0,
        policyDrift: 0,
        vectorProfileMissing: 0,
      },
      startedAt: timestamp,
      completedAt: timestamp,
    });
    writeJson(join(probesDir, 'prod-20260211-100000.json'), {
      env: 'prod',
      pass: true,
      parity: { pass: true, failures: 0, queryCount: 5 },
      strict: {
        pass: true,
        semantic503: 0,
        hybrid503: 0,
        policyDrift: 0,
        vectorProfileMissing: 0,
      },
      startedAt: timestamp,
      completedAt: timestamp,
    });
    const reindexEvidencePath = join(reindexDir, 'v2.0.0-unbounded.json');
    writeJson(reindexEvidencePath, {
      env: 'prod',
      pass: true,
      runId: 'run-100',
      run: {
        status: 'completed',
        chatsIngested: 10,
        turnsIngested: 120,
      },
    });
    const alertEvidencePath = join(alertsDir, 'latest.json');
    writeJson(alertEvidencePath, {
      generatedAt: '2026-02-11T10:00:00.000Z',
      verifiedAlertIds: ['api-5xx-spike-critical'],
    });

    const result = generateReleaseEvidence({
      tag: 'v2.0.0',
      commit: 'abc123',
      releaseRunId: '9001',
      releaseRunUrl: 'https://github.com/org/repo/actions/runs/9001',
      imageRef: 'ghcr.io/org/repo:v2.0.0',
      runtimeProbesDir: probesDir,
      releaseEvidenceDir: evidenceDir,
      releaseIndexPath: indexPath,
      reindexEvidence: reindexEvidencePath,
      alertVerificationArtifact: alertEvidencePath,
      rollbackNote: 'Rollback to v1.9.9 if strict mode degrades',
    });

    expect(result.pass).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.outputPath).toBeDefined();
    expect(result.record?.runtimeVerification.stagingProbeArtifact).toBe('staging-20260211-100000.json');
    expect(result.record?.runtimeVerification.productionProbeArtifact).toBe('prod-20260211-100000.json');

    const outputPath = result.outputPath as string;
    expect(existsSync(outputPath)).toBe(true);
    const output = readFileSync(outputPath, 'utf8');
    expect(output).toContain('"tag": "v2.0.0"');
    expect(output).toContain('"paritySmoke": "pass"');
    expect(output).toContain('"strictReadiness": "pass"');
    expect(output).toContain('staging-20260211-100000.json');
    expect(output).toContain('prod-20260211-100000.json');

    const index = readFileSync(indexPath, 'utf8');
    expect(index).toContain('## Runtime Evidence Ledger');
    expect(index).toContain('| `v2.0.0` |');
    expect(index).toContain('staging-20260211-100000.json');
    expect(index).toContain('prod-20260211-100000.json');
    expect(index).toContain('v2.0.0-unbounded.json');
  });

  it('fails when a required probe artifact is missing', () => {
    const root = mkdtempSync(join(tmpdir(), 'release-evidence-'));
    roots.push(root);
    const probesDir = join(root, 'runtime-probes');
    const evidenceDir = join(root, 'release-evidence');
    const indexPath = join(root, 'RELEASE_INDEX.md');
    writeFileSync(indexPath, '# Release Index\n', 'utf8');

    writeJson(join(probesDir, 'staging-20260211-120000.json'), {
      env: 'staging',
      pass: true,
      parity: { pass: true, failures: 0, queryCount: 5 },
      strict: {
        pass: true,
        semantic503: 0,
        hybrid503: 0,
        policyDrift: 0,
        vectorProfileMissing: 0,
      },
    });

    const result = generateReleaseEvidence({
      tag: 'v2.0.1',
      commit: 'def456',
      runtimeProbesDir: probesDir,
      releaseEvidenceDir: evidenceDir,
      releaseIndexPath: indexPath,
    });

    expect(result.pass).toBe(false);
    expect(result.outputPath).toBeUndefined();
    expect(result.errors.some((error) => error.includes('Missing prod probe artifact'))).toBe(true);
    expect(existsSync(join(evidenceDir, 'v2.0.1.json'))).toBe(false);
  });
});
