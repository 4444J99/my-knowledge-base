import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { basename, resolve } from 'path';

export interface ClosureEvidenceOptions {
  runtimeProbesDir?: string;
  releaseEvidenceDir?: string;
  releaseIndexPath?: string;
  releaseTag?: string;
}

export interface ClosureEvidenceCheckResult {
  pass: boolean;
  errors: string[];
  warnings: string[];
  selected: {
    stagingProbe?: string;
    prodProbe?: string;
    releaseEvidence?: string;
    reindexEvidence?: string;
    alertEvidence?: string;
  };
}

interface RuntimeProbeReport {
  env?: string;
  parity?: {
    pass?: boolean;
    failures?: number;
  };
  strict?: {
    pass?: boolean;
    semantic503?: number;
    hybrid503?: number;
    policyDrift?: number;
    vectorProfileMissing?: number;
  };
}

interface ReleaseEvidenceRecord {
  gates?: Record<string, unknown>;
  runtimeVerification?: {
    stagingProbeArtifact?: string;
    productionProbeArtifact?: string;
  };
  observability?: {
    alertVerificationArtifact?: string;
  };
  reindex?: {
    evidence?: string;
  };
}

function parseJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function listJsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const names = readdirSync(dir).filter((entry) => entry.toLowerCase().endsWith('.json'));
  return names
    .map((name) => resolve(dir, name))
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);
}

function pickLatestProbeFile(runtimeProbesDir: string, env: 'staging' | 'prod'): string | undefined {
  const candidates = listJsonFiles(runtimeProbesDir);
  for (const candidate of candidates) {
    try {
      const parsed = parseJson(candidate) as RuntimeProbeReport;
      if (parsed.env === env && parsed.parity && parsed.strict) {
        return candidate;
      }
    } catch {
      // ignore malformed files while scanning
    }
  }
  return undefined;
}

function validateRuntimeProbe(report: RuntimeProbeReport, env: 'staging' | 'prod'): string[] {
  const errors: string[] = [];

  if (report.env !== env) {
    errors.push(`Runtime probe env mismatch: expected ${env}, received ${String(report.env)}`);
    return errors;
  }
  if (!report.parity) {
    errors.push(`Runtime probe for ${env} missing parity section`);
  } else {
    if (report.parity.pass !== true) {
      errors.push(`Runtime probe parity gate failed for ${env}`);
    }
    if ((report.parity.failures ?? 0) > 0) {
      errors.push(`Runtime probe parity failures > 0 for ${env}`);
    }
  }
  if (!report.strict) {
    errors.push(`Runtime probe for ${env} missing strict section`);
  } else {
    if (report.strict.pass !== true) {
      errors.push(`Runtime probe strict gate failed for ${env}`);
    }
    if ((report.strict.semantic503 ?? 0) > 0) {
      errors.push(`Runtime probe semantic503 > 0 for ${env}`);
    }
    if ((report.strict.hybrid503 ?? 0) > 0) {
      errors.push(`Runtime probe hybrid503 > 0 for ${env}`);
    }
    if ((report.strict.policyDrift ?? 0) > 0) {
      errors.push(`Runtime probe policyDrift > 0 for ${env}`);
    }
    if ((report.strict.vectorProfileMissing ?? 0) > 0) {
      errors.push(`Runtime probe vectorProfileMissing > 0 for ${env}`);
    }
  }

  return errors;
}

function pickReleaseEvidenceFile(releaseEvidenceDir: string, releaseTag?: string): string | undefined {
  if (releaseTag) {
    const tagged = resolve(releaseEvidenceDir, `${releaseTag}.json`);
    return existsSync(tagged) ? tagged : undefined;
  }
  const candidates = listJsonFiles(releaseEvidenceDir);
  return candidates[0];
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function validateReleaseEvidence(
  releaseEvidencePath: string,
  stagingProbePath: string,
  prodProbePath: string,
): { errors: string[]; warnings: string[]; reindexEvidence?: string; alertEvidence?: string } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = parseJson(releaseEvidencePath) as ReleaseEvidenceRecord;
  const serialized = JSON.stringify(parsed).toLowerCase();

  const strictGate = parsed.gates?.strictReadiness;
  if (strictGate !== 'pass') {
    errors.push('Release evidence missing strict readiness context');
  }
  const parityGate = parsed.gates?.paritySmoke ?? parsed.gates?.parity;
  if (parityGate !== 'pass') {
    errors.push('Release evidence missing parity context');
  }

  const stagingName = basename(stagingProbePath).toLowerCase();
  const prodName = basename(prodProbePath).toLowerCase();
  if (
    parsed.runtimeVerification?.stagingProbeArtifact?.toLowerCase() !== stagingName &&
    !serialized.includes(stagingName)
  ) {
    errors.push(`Release evidence does not reference staging probe artifact: ${stagingName}`);
  }
  if (
    parsed.runtimeVerification?.productionProbeArtifact?.toLowerCase() !== prodName &&
    !serialized.includes(prodName)
  ) {
    errors.push(`Release evidence does not reference prod probe artifact: ${prodName}`);
  }

  const reindexEvidence = parsed.reindex?.evidence?.trim();
  if (!reindexEvidence) {
    errors.push('Release evidence missing reindex.evidence reference');
  } else if (/pending/i.test(reindexEvidence)) {
    errors.push(`Release evidence reindex reference is pending: ${reindexEvidence}`);
  } else if (!isHttpUrl(reindexEvidence)) {
    const resolved = resolve(reindexEvidence);
    if (!existsSync(resolved)) {
      errors.push(`Release evidence reindex artifact path not found: ${resolved}`);
    } else if (resolved.toLowerCase().endsWith('.json')) {
      try {
        const report = parseJson(resolved) as { pass?: boolean };
        if (report.pass !== true) {
          errors.push(`Reindex artifact indicates failure: ${resolved}`);
        }
      } catch (error) {
        errors.push(
          `Failed to parse reindex artifact JSON ${resolved}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    } else {
      warnings.push(`Reindex evidence path is not JSON; content integrity not parsed: ${resolved}`);
    }
  }

  const alertEvidence = parsed.observability?.alertVerificationArtifact?.trim();
  if (!alertEvidence || alertEvidence.toLowerCase() === 'missing') {
    errors.push('Release evidence missing observability.alertVerificationArtifact reference');
  } else if (/pending/i.test(alertEvidence)) {
    errors.push(`Release evidence alert verification reference is pending: ${alertEvidence}`);
  } else if (!isHttpUrl(alertEvidence)) {
    const resolved = resolve(alertEvidence);
    if (!existsSync(resolved)) {
      errors.push(`Release evidence alert verification artifact path not found: ${resolved}`);
    } else if (resolved.toLowerCase().endsWith('.json')) {
      try {
        const alertDoc = parseJson(resolved) as { verifiedAlertIds?: unknown[] };
        if (!Array.isArray(alertDoc.verifiedAlertIds) || alertDoc.verifiedAlertIds.length === 0) {
          errors.push(`Alert verification artifact missing verifiedAlertIds content: ${resolved}`);
        }
      } catch (error) {
        errors.push(
          `Failed to parse alert verification artifact JSON ${resolved}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    } else {
      warnings.push(`Alert verification artifact is not JSON; content integrity not parsed: ${resolved}`);
    }
  }

  return {
    errors,
    warnings,
    reindexEvidence,
    alertEvidence,
  };
}

function validateReleaseIndex(
  releaseIndexPath: string,
  stagingProbePath: string,
  prodProbePath: string,
  reindexEvidence?: string,
): string[] {
  const errors: string[] = [];
  if (!existsSync(releaseIndexPath)) {
    return [`Release index not found: ${releaseIndexPath}`];
  }

  const content = readFileSync(releaseIndexPath, 'utf8').toLowerCase();
  const stagingName = basename(stagingProbePath).toLowerCase();
  const prodName = basename(prodProbePath).toLowerCase();

  if (!content.includes(stagingName)) {
    errors.push(`Release index missing staging probe artifact reference: ${stagingName}`);
  }
  if (!content.includes(prodName)) {
    errors.push(`Release index missing prod probe artifact reference: ${prodName}`);
  }
  if (reindexEvidence) {
    const reindexKey = basename(reindexEvidence).toLowerCase();
    if (!content.includes(reindexKey)) {
      errors.push(`Release index missing reindex evidence reference: ${reindexKey}`);
    }
  } else if (!content.includes('reindex')) {
    errors.push('Release index missing reindex evidence reference');
  }

  return errors;
}

export function verifyClosureEvidence(options: ClosureEvidenceOptions = {}): ClosureEvidenceCheckResult {
  const runtimeProbesDir = resolve(options.runtimeProbesDir || 'docs/evidence/runtime-probes');
  const releaseEvidenceDir = resolve(options.releaseEvidenceDir || 'docs/evidence/release-evidence');
  const releaseIndexPath = resolve(options.releaseIndexPath || 'docs/RELEASE_INDEX.md');

  const errors: string[] = [];
  const warnings: string[] = [];
  let reindexEvidence: string | undefined;
  let alertEvidence: string | undefined;

  const stagingProbe = pickLatestProbeFile(runtimeProbesDir, 'staging');
  const prodProbe = pickLatestProbeFile(runtimeProbesDir, 'prod');

  if (!stagingProbe) {
    errors.push(`No staging runtime probe artifact found in ${runtimeProbesDir}`);
  }
  if (!prodProbe) {
    errors.push(`No prod runtime probe artifact found in ${runtimeProbesDir}`);
  }

  if (stagingProbe) {
    try {
      const parsed = parseJson(stagingProbe) as RuntimeProbeReport;
      errors.push(...validateRuntimeProbe(parsed, 'staging'));
    } catch (error) {
      errors.push(
        `Failed to parse staging runtime probe ${stagingProbe}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  if (prodProbe) {
    try {
      const parsed = parseJson(prodProbe) as RuntimeProbeReport;
      errors.push(...validateRuntimeProbe(parsed, 'prod'));
    } catch (error) {
      errors.push(
        `Failed to parse prod runtime probe ${prodProbe}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  const releaseEvidence = pickReleaseEvidenceFile(releaseEvidenceDir, options.releaseTag);
  if (!releaseEvidence) {
    if (options.releaseTag) {
      errors.push(`Release evidence missing for tag ${options.releaseTag} in ${releaseEvidenceDir}`);
    } else {
      errors.push(`No release evidence JSON found in ${releaseEvidenceDir}`);
    }
  }

  if (releaseEvidence && stagingProbe && prodProbe) {
    try {
      const validation = validateReleaseEvidence(releaseEvidence, stagingProbe, prodProbe);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
      reindexEvidence = validation.reindexEvidence;
      alertEvidence = validation.alertEvidence;
    } catch (error) {
      errors.push(
        `Failed to parse release evidence ${releaseEvidence}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  } else if (releaseEvidence && (!stagingProbe || !prodProbe)) {
    warnings.push('Release evidence found but runtime probes are incomplete; cross-reference checks skipped.');
  }

  if (stagingProbe && prodProbe) {
    errors.push(...validateReleaseIndex(releaseIndexPath, stagingProbe, prodProbe, reindexEvidence));
  }

  return {
    pass: errors.length === 0,
    errors,
    warnings,
    selected: {
      stagingProbe,
      prodProbe,
      releaseEvidence,
      reindexEvidence,
      alertEvidence,
    },
  };
}
