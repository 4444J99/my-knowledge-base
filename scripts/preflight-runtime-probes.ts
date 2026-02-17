#!/usr/bin/env node

/**
 * Runtime probe preflight gate.
 * Validates required release-gate environment configuration before probe execution.
 */

export const REQUIRED_ENV_KEYS = [
  'OP_SERVICE_ACCOUNT_TOKEN',
  'OP_STAGING_BASE_URL_REF',
  'OP_PROD_BASE_URL_REF',
  'REINDEX_EVIDENCE_REF',
] as const;

export const ONEPASSWORD_REF_KEYS = [
  'OP_STAGING_BASE_URL_REF',
  'OP_PROD_BASE_URL_REF',
] as const;

const ONEPASSWORD_REF_PATTERN = /^op:\/\/[^/\s]+\/[^/\s]+\/[^/\s]+(?:\/[^/\s]+)?$/i;

export interface RuntimeProbePreflightOptions {
  strict?: boolean;
  env?: NodeJS.ProcessEnv;
}

export interface RuntimeProbePreflightResult {
  pass: boolean;
  strict: boolean;
  errors: string[];
  warnings: string[];
  values: Record<string, string | undefined>;
}

function hasPendingMarker(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.includes('pending') || normalized === 'missing' || normalized === 'todo';
}

function parseArgs(argv: string[]): { strict: boolean; help: boolean } {
  return {
    strict: argv.includes('--strict'),
    help: argv.includes('--help'),
  };
}

function printUsage(): void {
  console.log(`Usage: tsx scripts/preflight-runtime-probes.ts [options]

Options:
  --strict   Fail on warnings (in addition to errors)
  --help     Print this help message
`);
}

export function runRuntimeProbePreflight(
  options: RuntimeProbePreflightOptions = {},
): RuntimeProbePreflightResult {
  const env = options.env ?? process.env;
  const strict = options.strict === true;
  const errors: string[] = [];
  const warnings: string[] = [];

  const values: Record<string, string | undefined> = {};
  for (const key of REQUIRED_ENV_KEYS) {
    values[key] = env[key];
  }

  for (const key of REQUIRED_ENV_KEYS) {
    const value = env[key]?.trim();
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  for (const key of ONEPASSWORD_REF_KEYS) {
    const value = env[key]?.trim();
    if (!value) continue;
    if (!ONEPASSWORD_REF_PATTERN.test(value)) {
      errors.push(`Invalid 1Password reference format for ${key}: ${value}`);
    }
  }

  const reindexReference = env.REINDEX_EVIDENCE_REF?.trim();
  if (reindexReference) {
    if (hasPendingMarker(reindexReference)) {
      errors.push(`REINDEX_EVIDENCE_REF must not be pending/missing: ${reindexReference}`);
    }
    if (reindexReference.startsWith('op://')) {
      warnings.push(
        'REINDEX_EVIDENCE_REF currently points to a 1Password reference; release gates typically expect a concrete path or URL.',
      );
    }
  }

  return {
    pass: errors.length === 0 && (!strict || warnings.length === 0),
    strict,
    errors,
    warnings,
    values,
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  const result = runRuntimeProbePreflight({ strict: args.strict });

  console.log('\nRuntime Probe Preflight');
  console.log('-----------------------');
  console.log(`strict=${result.strict}`);
  console.log(`pass=${result.pass}`);
  for (const key of REQUIRED_ENV_KEYS) {
    console.log(`${key}=${result.values[key] ? '[set]' : '[missing]'}`);
  }

  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    for (const warning of result.warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    for (const error of result.errors) {
      console.log(`- ${error}`);
    }
  }

  if (!result.pass) {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    console.error('Runtime probe preflight failed unexpectedly:', error);
    process.exit(1);
  }
}
