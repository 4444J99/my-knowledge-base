import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { basename, dirname, resolve } from 'path';

export interface ReleaseEvidenceOptions {
  tag?: string;
  commit?: string;
  releaseRunId?: string;
  releaseRunUrl?: string;
  ciRunId?: string;
  ciRunUrl?: string;
  imageRef?: string;
  runtimeProbesDir?: string;
  releaseEvidenceDir?: string;
  releaseIndexPath?: string;
  stagingProbePath?: string;
  prodProbePath?: string;
  reindexEvidence?: string;
  alertVerificationArtifact?: string;
  rollbackNote?: string;
  updateReleaseIndex?: boolean;
  allowIncomplete?: boolean;
}

export interface ReleaseEvidenceResult {
  pass: boolean;
  errors: string[];
  warnings: string[];
  outputPath?: string;
  indexUpdated: boolean;
  record?: ReleaseEvidenceRecord;
}

interface RuntimeProbeReport {
  env?: string;
  parity?: {
    pass?: boolean;
    failures?: number;
    queryCount?: number;
  };
  strict?: {
    pass?: boolean;
    semantic503?: number;
    hybrid503?: number;
    policyDrift?: number;
    vectorProfileMissing?: number;
  };
}

export interface ReleaseEvidenceRecord {
  tag: string;
  commit: string;
  generatedAt: string;
  releaseWorkflow: {
    runId?: string;
    runUrl?: string;
  };
  ciWorkflow: {
    runId?: string;
    runUrl?: string;
  };
  imageRef?: string;
  gates: {
    paritySmoke: 'pass' | 'fail';
    strictReadiness: 'pass' | 'fail';
    runtimeProbes: 'pass' | 'fail';
  };
  runtimeVerification: {
    stagingProbeArtifact: string;
    productionProbeArtifact: string;
    stagingProbePass: boolean;
    productionProbePass: boolean;
  };
  observability: {
    alertVerificationArtifact?: string;
    status: 'provided' | 'missing';
  };
  reindex: {
    evidence: string;
    status: 'provided' | 'missing';
  };
  rollback: {
    note: string;
  };
}

function parseJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function listJsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir).filter((entry) => entry.toLowerCase().endsWith('.json'));
  return entries
    .map((entry) => resolve(dir, entry))
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);
}

function normalizeTag(tag?: string): string {
  if (!tag) return '';
  return tag.replace(/^refs\/tags\//, '').trim();
}

function resolveOptionalPath(path: string | undefined): string | undefined {
  const value = path?.trim();
  if (!value) return undefined;
  return resolve(value);
}

function inferReleaseRunUrl(explicit?: string): string | undefined {
  if (explicit && explicit.trim()) return explicit.trim();
  const server = process.env.GITHUB_SERVER_URL;
  const repo = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  if (!server || !repo || !runId) return undefined;
  return `${server}/${repo}/actions/runs/${runId}`;
}

function pickProbe(runtimeProbesDir: string, env: 'staging' | 'prod'): string | undefined {
  const candidates = listJsonFiles(runtimeProbesDir);
  for (const candidate of candidates) {
    try {
      const parsed = parseJson(candidate) as RuntimeProbeReport;
      if (parsed.env === env && parsed.parity && parsed.strict) {
        return candidate;
      }
    } catch {
      // skip malformed files while scanning
    }
  }
  return undefined;
}

function loadProbe(path: string, env: 'staging' | 'prod', errors: string[]): RuntimeProbeReport {
  let parsed: RuntimeProbeReport;
  try {
    parsed = parseJson(path) as RuntimeProbeReport;
  } catch (error) {
    errors.push(`Failed to parse ${env} probe ${path}: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }

  if (parsed.env !== env) {
    errors.push(`${env} probe has env=${String(parsed.env)} at ${path}`);
  }
  if (!parsed.parity) {
    errors.push(`${env} probe missing parity section at ${path}`);
  }
  if (!parsed.strict) {
    errors.push(`${env} probe missing strict section at ${path}`);
  }
  return parsed;
}

function hasStrictPass(report: RuntimeProbeReport): boolean {
  return (
    report.strict?.pass === true &&
    (report.strict?.semantic503 ?? 0) === 0 &&
    (report.strict?.hybrid503 ?? 0) === 0 &&
    (report.strict?.policyDrift ?? 0) === 0 &&
    (report.strict?.vectorProfileMissing ?? 0) === 0
  );
}

function hasParityPass(report: RuntimeProbeReport): boolean {
  return report.parity?.pass === true && (report.parity?.failures ?? 0) === 0;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function validateReindexEvidenceReference(
  reference: string | undefined,
  allowIncomplete: boolean | undefined,
  errors: string[],
  warnings: string[],
): string | undefined {
  const value = reference?.trim();
  if (!value) {
    if (allowIncomplete) {
      warnings.push('Reindex evidence not provided.');
    } else {
      errors.push('Reindex evidence is required.');
    }
    return undefined;
  }

  if (/pending/i.test(value)) {
    if (allowIncomplete) {
      warnings.push(`Reindex evidence is pending: ${value}`);
    } else {
      errors.push(`Reindex evidence must not be pending: ${value}`);
    }
    return value;
  }

  if (isHttpUrl(value)) {
    return value;
  }

  const resolved = resolve(value);
  if (!existsSync(resolved)) {
    if (allowIncomplete) {
      warnings.push(`Reindex evidence path not found: ${resolved}`);
    } else {
      errors.push(`Reindex evidence path not found: ${resolved}`);
    }
    return value;
  }

  if (resolved.toLowerCase().endsWith('.json')) {
    try {
      const parsed = parseJson(resolved) as { pass?: boolean };
      if (parsed.pass !== true) {
        if (allowIncomplete) {
          warnings.push(`Reindex evidence JSON indicates non-pass state: ${resolved}`);
        } else {
          errors.push(`Reindex evidence JSON indicates non-pass state: ${resolved}`);
        }
      }
    } catch (error) {
      if (allowIncomplete) {
        warnings.push(
          `Failed to parse reindex evidence JSON ${resolved}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      } else {
        errors.push(
          `Failed to parse reindex evidence JSON ${resolved}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  return value;
}

function upsertReleaseIndexRuntimeLedger(
  releaseIndexPath: string,
  row: string,
  tag: string,
): boolean {
  const ledgerHeader = '## Runtime Evidence Ledger';
  const tableHeader =
    '| Tag | Release Evidence JSON | Staging Probe Artifact | Production Probe Artifact | Reindex Evidence | Alert Verification | Rollback Note |';
  const separator = '|---|---|---|---|---|---|---|';

  const path = resolve(releaseIndexPath);
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : '# Release Index\n';
  const lines = existing.split('\n');

  const headerIndex = lines.findIndex((line) => line.trim() === ledgerHeader);
  if (headerIndex < 0) {
    const next = existing.trimEnd();
    const block = [
      '',
      ledgerHeader,
      '',
      tableHeader,
      separator,
      row,
      '',
    ].join('\n');
    writeFileSync(path, `${next}\n${block}`, 'utf8');
    return true;
  }

  let sectionEnd = lines.length;
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith('## ')) {
      sectionEnd = index;
      break;
    }
  }

  let tableHeaderIndex = -1;
  for (let index = headerIndex + 1; index < sectionEnd; index += 1) {
    if (lines[index].trim() === tableHeader) {
      tableHeaderIndex = index;
      break;
    }
  }

  if (tableHeaderIndex < 0) {
    lines.splice(headerIndex + 1, 0, '', tableHeader, separator, row, '');
    writeFileSync(path, `${lines.join('\n').replace(/\n+$/, '\n')}`, 'utf8');
    return true;
  }

  const tagCell = `\`${tag}\``;
  let replaced = false;
  for (let index = tableHeaderIndex + 2; index < sectionEnd; index += 1) {
    const line = lines[index];
    if (!line.trim().startsWith('|')) continue;
    if (line.includes(`| ${tagCell} |`)) {
      lines[index] = row;
      replaced = true;
      break;
    }
  }

  if (!replaced) {
    let insertAt = sectionEnd;
    for (let index = tableHeaderIndex + 2; index < sectionEnd; index += 1) {
      if (!lines[index].trim().startsWith('|')) {
        insertAt = index;
        break;
      }
    }
    lines.splice(insertAt, 0, row);
  }

  writeFileSync(path, `${lines.join('\n').replace(/\n+$/, '\n')}`, 'utf8');
  return true;
}

export function generateReleaseEvidence(options: ReleaseEvidenceOptions = {}): ReleaseEvidenceResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const tag = normalizeTag(options.tag || process.env.GITHUB_REF_NAME || process.env.RELEASE_TAG);
  if (!tag) {
    errors.push('Release tag is required (set --tag or GITHUB_REF_NAME).');
  }
  const commit = (options.commit || process.env.GITHUB_SHA || '').trim();
  if (!commit) {
    errors.push('Release commit is required (set --commit or GITHUB_SHA).');
  }

  const runtimeProbesDir = resolve(options.runtimeProbesDir || 'docs/evidence/runtime-probes');
  const releaseEvidenceDir = resolve(options.releaseEvidenceDir || 'docs/evidence/release-evidence');
  const releaseIndexPath = resolve(options.releaseIndexPath || 'docs/RELEASE_INDEX.md');

  const stagingProbePath =
    resolveOptionalPath(options.stagingProbePath) || pickProbe(runtimeProbesDir, 'staging');
  const prodProbePath = resolveOptionalPath(options.prodProbePath) || pickProbe(runtimeProbesDir, 'prod');

  if (!stagingProbePath || !existsSync(stagingProbePath)) {
    errors.push(`Missing staging probe artifact (expected in ${runtimeProbesDir}).`);
  }
  if (!prodProbePath || !existsSync(prodProbePath)) {
    errors.push(`Missing prod probe artifact (expected in ${runtimeProbesDir}).`);
  }

  const stagingProbe = stagingProbePath && existsSync(stagingProbePath)
    ? loadProbe(stagingProbePath, 'staging', errors)
    : {};
  const prodProbe = prodProbePath && existsSync(prodProbePath)
    ? loadProbe(prodProbePath, 'prod', errors)
    : {};

  const stagingParityPass = hasParityPass(stagingProbe);
  const prodParityPass = hasParityPass(prodProbe);
  const stagingStrictPass = hasStrictPass(stagingProbe);
  const prodStrictPass = hasStrictPass(prodProbe);

  if (!stagingParityPass || !prodParityPass) {
    errors.push('Parity probe gate did not pass for both staging and prod.');
  }
  if (!stagingStrictPass || !prodStrictPass) {
    errors.push('Strict readiness probe gate did not pass for both staging and prod.');
  }

  const alertArtifact = options.alertVerificationArtifact?.trim();
  if (!alertArtifact) {
    warnings.push('Alert verification artifact not provided.');
  }
  const reindexEvidence = validateReindexEvidenceReference(
    options.reindexEvidence,
    options.allowIncomplete,
    errors,
    warnings,
  );

  if (errors.length > 0 && !options.allowIncomplete) {
    return {
      pass: false,
      errors,
      warnings,
      indexUpdated: false,
    };
  }

  const releaseRunId = (options.releaseRunId || process.env.GITHUB_RUN_ID || '').trim() || undefined;
  const releaseRunUrl = inferReleaseRunUrl(options.releaseRunUrl);
  const ciRunId = (options.ciRunId || '').trim() || undefined;
  const ciRunUrl = (options.ciRunUrl || '').trim() || undefined;
  const imageRef = (options.imageRef || '').trim() || undefined;

  const evidenceTag = tag || 'unknown-tag';
  const evidenceCommit = commit || 'unknown-commit';
  const stagingArtifact = basename(stagingProbePath || 'missing-staging-probe.json');
  const prodArtifact = basename(prodProbePath || 'missing-prod-probe.json');
  const outputPath = resolve(releaseEvidenceDir, `${evidenceTag}.json`);

  const record: ReleaseEvidenceRecord = {
    tag: evidenceTag,
    commit: evidenceCommit,
    generatedAt: new Date().toISOString(),
    releaseWorkflow: {
      runId: releaseRunId,
      runUrl: releaseRunUrl,
    },
    ciWorkflow: {
      runId: ciRunId,
      runUrl: ciRunUrl,
    },
    imageRef,
    gates: {
      paritySmoke: stagingParityPass && prodParityPass ? 'pass' : 'fail',
      strictReadiness: stagingStrictPass && prodStrictPass ? 'pass' : 'fail',
      runtimeProbes: stagingParityPass && prodParityPass && stagingStrictPass && prodStrictPass ? 'pass' : 'fail',
    },
    runtimeVerification: {
      stagingProbeArtifact: stagingArtifact,
      productionProbeArtifact: prodArtifact,
      stagingProbePass: stagingParityPass && stagingStrictPass,
      productionProbePass: prodParityPass && prodStrictPass,
    },
    observability: {
      alertVerificationArtifact: alertArtifact,
      status: alertArtifact ? 'provided' : 'missing',
    },
    reindex: {
      evidence: reindexEvidence || 'missing',
      status: reindexEvidence ? 'provided' : 'missing',
    },
    rollback: {
      note: options.rollbackNote?.trim() || 'not specified',
    },
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');

  let indexUpdated = false;
  if (options.updateReleaseIndex !== false) {
    const row = `| \`${record.tag}\` | \`docs/evidence/release-evidence/${record.tag}.json\` | \`${record.runtimeVerification.stagingProbeArtifact}\` | \`${record.runtimeVerification.productionProbeArtifact}\` | ${record.reindex.evidence} | ${record.observability.alertVerificationArtifact || 'missing'} | ${record.rollback.note} |`;
    indexUpdated = upsertReleaseIndexRuntimeLedger(releaseIndexPath, row, record.tag);
  }

  return {
    pass: errors.length === 0 || options.allowIncomplete === true,
    errors,
    warnings,
    outputPath,
    indexUpdated,
    record,
  };
}
