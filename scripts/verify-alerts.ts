#!/usr/bin/env node

/**
 * Alert definition verifier.
 * - Validates required alert IDs exist in repo-managed alert config.
 * - In strict mode, also validates evidence artifact coverage.
 */

import { config } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';

config();

const REQUIRED_ALERT_IDS = [
  'api-5xx-spike-critical',
  'db-sqlite-busy-warning',
  'degraded-rate-warning',
  'degraded-rate-critical',
  'search-latency-p95-warning',
  'search-latency-p95-critical',
  'auth-init-failure-critical',
  'strict-search-503-critical',
  'vector-profile-drift-warning',
  'semantic-policy-drift-warning',
];

interface AlertRule {
  id: string;
  severity: string;
  implemented?: boolean;
  verified?: boolean;
}

interface AlertFile {
  version?: number;
  alerts?: AlertRule[];
}

interface VerificationEvidence {
  generatedAt?: string;
  verifiedAlertIds?: string[];
}

function parseArgs(argv: string[]): { strict: boolean; configPath: string; evidencePath: string } {
  const getValue = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    if (idx < 0) return undefined;
    return argv[idx + 1];
  };
  return {
    strict: argv.includes('--strict'),
    configPath: getValue('--config') || 'ops/alerts/search-runtime-alerts.yaml',
    evidencePath: getValue('--evidence') || 'docs/evidence/alert-verification/latest.json',
  };
}

function loadAlertFile(path: string): AlertFile {
  const raw = readFileSync(path, 'utf8');
  const parsed = yaml.load(raw) as AlertFile;
  if (!parsed || !Array.isArray(parsed.alerts)) {
    throw new Error(`Alert config ${path} has invalid schema (alerts array required).`);
  }
  return parsed;
}

function loadEvidence(path: string): VerificationEvidence {
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw) as VerificationEvidence;
}

function printUsage(): void {
  console.log(`Usage: tsx scripts/verify-alerts.ts [options]

Options:
  --strict             Require verification evidence coverage for all required alerts
  --config <path>      Alert config path (default: ops/alerts/search-runtime-alerts.yaml)
  --evidence <path>    Verification evidence JSON (default: docs/evidence/alert-verification/latest.json)
  --help               Print help
`);
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  const args = parseArgs(argv);
  const configPath = resolve(args.configPath);
  const evidencePath = resolve(args.evidencePath);

  if (!existsSync(configPath)) {
    console.error(`Missing alert config: ${configPath}`);
    process.exit(1);
  }

  const alertFile = loadAlertFile(configPath);
  const alerts = alertFile.alerts || [];
  const ids = new Set(alerts.map((alert) => alert.id));

  const missingRequired = REQUIRED_ALERT_IDS.filter((id) => !ids.has(id));
  const notImplemented = alerts.filter((alert) => alert.implemented !== true).map((alert) => alert.id);

  console.log('\nAlert Definition Verification');
  console.log('-----------------------------');
  console.log(`config=${configPath}`);
  console.log(`alerts.total=${alerts.length}`);
  console.log(`required.total=${REQUIRED_ALERT_IDS.length}`);
  console.log(`required.missing=${missingRequired.length}`);
  console.log(`implemented.false=${notImplemented.length}`);

  if (missingRequired.length > 0) {
    console.error(`Missing required alert IDs: ${missingRequired.join(', ')}`);
    process.exit(1);
  }

  if (notImplemented.length > 0) {
    console.error(`Some alert rules are not marked implemented: ${notImplemented.join(', ')}`);
    process.exit(1);
  }

  if (args.strict) {
    if (!existsSync(evidencePath)) {
      console.error(`Strict mode requires evidence file: ${evidencePath}`);
      process.exit(1);
    }

    const evidence = loadEvidence(evidencePath);
    const verifiedSet = new Set(evidence.verifiedAlertIds || []);
    const missingEvidence = REQUIRED_ALERT_IDS.filter((id) => !verifiedSet.has(id));

    console.log(`evidence=${evidencePath}`);
    console.log(`evidence.generatedAt=${evidence.generatedAt || 'n/a'}`);
    console.log(`evidence.missing=${missingEvidence.length}`);

    if (missingEvidence.length > 0) {
      console.error(`Missing strict evidence for alerts: ${missingEvidence.join(', ')}`);
      process.exit(1);
    }
  }

  console.log('Alert verification passed.');
}

main();
