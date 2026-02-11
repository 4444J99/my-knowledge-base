#!/usr/bin/env node

import { config } from 'dotenv';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { evaluateReindexRun } from '../src/reindex-evidence.js';
import type { UniverseIngestRun, UniverseReindexStart } from '@knowledge-base/contracts';

config();

type ProbeEnv = 'local' | 'staging' | 'prod';

interface ParsedArgs {
  env: ProbeEnv;
  baseUrl?: string;
  authHeader?: string;
  out?: string;
  runId?: string;
  pollIntervalMs: number;
  maxWaitMs: number;
  timeoutMs: number;
  minChatsIngested: number;
  minTurnsIngested: number;
  requireUnbounded: boolean;
}

interface ReindexEvidenceReport {
  env: ProbeEnv;
  baseUrl: string;
  startedAt: string;
  completedAt: string;
  runId: string;
  pollAttempts: number;
  elapsedMs: number;
  thresholds: {
    minChatsIngested: number;
    minTurnsIngested: number;
    requireUnbounded: boolean;
  };
  run: Partial<UniverseIngestRun>;
  pass: boolean;
  errors: string[];
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

function parseArgs(argv: string[]): ParsedArgs {
  const getValue = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    if (index < 0) return undefined;
    return argv[index + 1];
  };

  const env = (getValue('--env') || 'local') as ProbeEnv;
  if (!['local', 'staging', 'prod'].includes(env)) {
    throw new Error(`Invalid --env "${env}". Expected: local|staging|prod`);
  }

  const pollIntervalMs = Number.parseInt(getValue('--poll-interval-ms') || '2000', 10);
  const maxWaitMs = Number.parseInt(getValue('--max-wait-ms') || '3600000', 10);
  const timeoutMs = Number.parseInt(getValue('--timeout-ms') || '15000', 10);
  const minChatsIngested = Number.parseInt(getValue('--min-chats') || '1', 10);
  const minTurnsIngested = Number.parseInt(getValue('--min-turns') || '1', 10);
  const requireUnbounded = parseBoolean(getValue('--require-unbounded'), true);

  return {
    env,
    baseUrl: getValue('--base-url'),
    authHeader: getValue('--auth-header'),
    out: getValue('--out'),
    runId: getValue('--run-id'),
    pollIntervalMs: Number.isFinite(pollIntervalMs) && pollIntervalMs > 0 ? pollIntervalMs : 2000,
    maxWaitMs: Number.isFinite(maxWaitMs) && maxWaitMs > 0 ? maxWaitMs : 3600000,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000,
    minChatsIngested: Number.isFinite(minChatsIngested) && minChatsIngested >= 0 ? minChatsIngested : 1,
    minTurnsIngested: Number.isFinite(minTurnsIngested) && minTurnsIngested >= 0 ? minTurnsIngested : 1,
    requireUnbounded,
  };
}

function resolveBaseUrl(args: ParsedArgs): string {
  if (args.baseUrl) return args.baseUrl.replace(/\/+$/, '');
  if (args.env === 'local') {
    return (process.env.LOCAL_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
  }
  if (args.env === 'staging') {
    const value = process.env.STAGING_BASE_URL;
    if (!value) {
      throw new Error('STAGING_BASE_URL is required when --env staging is used.');
    }
    return value.replace(/\/+$/, '');
  }
  const value = process.env.PROD_BASE_URL;
  if (!value) {
    throw new Error('PROD_BASE_URL is required when --env prod is used.');
  }
  return value.replace(/\/+$/, '');
}

function resolveHeaders(args: ParsedArgs): Record<string, string> {
  const fromEnv =
    args.env === 'staging'
      ? process.env.STAGING_AUTH_HEADER
      : args.env === 'prod'
        ? process.env.PROD_AUTH_HEADER
        : process.env.LOCAL_AUTH_HEADER;
  const raw = (args.authHeader || fromEnv || '').trim();
  if (!raw) return {};

  if (raw.includes(':')) {
    const [name, ...rest] = raw.split(':');
    const value = rest.join(':').trim();
    if (!name.trim() || !value) return {};
    return { [name.trim()]: value };
  }

  return { Authorization: raw };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ status: number; ok: boolean; body: any; text: string }> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  const body = text.length > 0 ? JSON.parse(text) : {};
  return {
    status: response.status,
    ok: response.ok,
    body,
    text,
  };
}

function defaultOutputPath(env: ProbeEnv): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `docs/evidence/reindex-runs/${env}-${timestamp}.json`;
}

function writeReport(outPath: string, report: ReindexEvidenceReport): void {
  const absolute = resolve(outPath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function printUsage(): void {
  console.log(`Usage: tsx scripts/capture-reindex-evidence.ts [options]

Options:
  --env <local|staging|prod>         Target environment (default: local)
  --base-url <url>                   Override base URL
  --auth-header <header>             Optional auth header
  --run-id <id>                      Existing run ID to watch (skip POST /reindex)
  --out <path>                       Output report path
  --poll-interval-ms <n>             Poll interval in milliseconds (default: 2000)
  --max-wait-ms <n>                  Maximum wait before timeout (default: 3600000)
  --timeout-ms <n>                   HTTP timeout in milliseconds (default: 15000)
  --min-chats <n>                    Minimum chatsIngested threshold (default: 1)
  --min-turns <n>                    Minimum turnsIngested threshold (default: 1)
  --require-unbounded <true|false>   Fail when metadata indicates limit/bounded run (default: true)
  --help                             Show help
`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  const args = parseArgs(argv);
  const baseUrl = resolveBaseUrl(args);
  const headers = resolveHeaders(args);
  const startedAt = Date.now();
  const startedAtIso = new Date(startedAt).toISOString();

  let runId = args.runId;
  if (!runId) {
    const start = await fetchJson(
      `${baseUrl}/api/universe/reindex`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      },
      args.timeoutMs,
    );
    if (!start.ok || !start.body?.data?.runId) {
      throw new Error(`Failed to start reindex: status=${start.status} body=${start.text}`);
    }
    runId = (start.body.data as UniverseReindexStart).runId;
  }

  let attempts = 0;
  let runPayload: Partial<UniverseIngestRun> | undefined;
  const deadline = startedAt + args.maxWaitMs;

  while (Date.now() <= deadline) {
    attempts += 1;
    const statusResponse = await fetchJson(
      `${baseUrl}/api/universe/reindex/${encodeURIComponent(runId)}`,
      { method: 'GET', headers },
      args.timeoutMs,
    );
    if (!statusResponse.ok || !statusResponse.body?.data) {
      throw new Error(
        `Failed to poll run ${runId}: status=${statusResponse.status} body=${statusResponse.text}`,
      );
    }

    runPayload = statusResponse.body.data as UniverseIngestRun;
    if (runPayload.status === 'completed' || runPayload.status === 'failed') {
      break;
    }
    await sleep(args.pollIntervalMs);
  }

  if (!runPayload) {
    throw new Error(`Run payload never became available for runId=${runId}`);
  }

  const elapsedMs = Date.now() - startedAt;
  if (runPayload.status !== 'completed' && runPayload.status !== 'failed' && Date.now() > deadline) {
    throw new Error(
      `Timed out waiting for run ${runId} after ${elapsedMs}ms (status=${String(runPayload.status)})`,
    );
  }

  const evaluation = evaluateReindexRun(runPayload, {
    minChatsIngested: args.minChatsIngested,
    minTurnsIngested: args.minTurnsIngested,
    requireUnbounded: args.requireUnbounded,
  });

  const report: ReindexEvidenceReport = {
    env: args.env,
    baseUrl,
    startedAt: startedAtIso,
    completedAt: new Date().toISOString(),
    runId,
    pollAttempts: attempts,
    elapsedMs,
    thresholds: {
      minChatsIngested: args.minChatsIngested,
      minTurnsIngested: args.minTurnsIngested,
      requireUnbounded: args.requireUnbounded,
    },
    run: runPayload,
    pass: evaluation.pass,
    errors: evaluation.errors,
  };

  const outPath = args.out || defaultOutputPath(args.env);
  writeReport(outPath, report);

  console.log('\nReindex Evidence Capture');
  console.log('-----------------------');
  console.log(`env=${args.env}`);
  console.log(`runId=${runId}`);
  console.log(`status=${String(runPayload.status)}`);
  console.log(`pass=${report.pass}`);
  console.log(`pollAttempts=${attempts}`);
  console.log(`elapsedMs=${elapsedMs}`);
  console.log(`report=${resolve(outPath)}`);
  if (report.errors.length > 0) {
    console.log('\nErrors:');
    for (const error of report.errors) {
      console.log(`- ${error}`);
    }
  }

  if (!report.pass) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Reindex evidence capture failed:', error);
  process.exit(1);
});
