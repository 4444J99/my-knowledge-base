#!/usr/bin/env node

/**
 * Runtime probe utility for:
 * 1) /api/search vs /api/search/fts parity
 * 2) strict semantic/hybrid readiness behavior
 */

import { config } from 'dotenv';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

config();

type ProbeMode = 'all' | 'parity' | 'strict';
type ProbeEnv = 'local' | 'staging' | 'prod';

interface ParsedArgs {
  mode: ProbeMode;
  env: ProbeEnv;
  baseUrl?: string;
  authHeader?: string;
  out?: string;
  timeoutMs: number;
  page: number;
  pageSize: number;
  maxAllowed503: number;
  requireStrictPolicy: boolean;
  requireVectorProfile: boolean;
  parityQueries: string[];
  strictQueries: string[];
}

interface EndpointResponse {
  status: number;
  ok: boolean;
  body: any;
  rawText?: string;
  error?: string;
}

interface ParitySample {
  query: string;
  searchStatus: number;
  ftsStatus: number;
  sameIds: boolean;
  samePagination: boolean;
  sameNormalizedQuery: boolean;
  idsSearch: string[];
  idsFts: string[];
}

interface StrictSample {
  query: string;
  semanticStatus: number;
  hybridStatus: number;
  semanticPolicyApplied?: string;
  hybridPolicyApplied?: string;
  semanticVectorProfileId?: string;
  hybridVectorProfileId?: string;
}

const DEFAULT_PARITY_QUERIES = ['react', 'TypeScript', 'design', '', 'nonexistent-term-12345'];
const DEFAULT_STRICT_QUERIES = [
  'strict probe one',
  'strict probe two',
  'semantic readiness',
  'hybrid readiness',
  'vector profile',
  'fallback policy',
  'react hooks',
  'typescript generics',
  'database optimization',
  'api authentication',
];

function parseList(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

function parseArgs(argv: string[]): ParsedArgs {
  const getValue = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    if (idx < 0) return undefined;
    return argv[idx + 1];
  };

  const mode = (getValue('--mode') || 'all') as ProbeMode;
  const env = (getValue('--env') || 'local') as ProbeEnv;
  const baseUrl = getValue('--base-url');
  const authHeader = getValue('--auth-header');
  const out = getValue('--out');
  const timeoutMs = Number.parseInt(getValue('--timeout-ms') || '15000', 10);
  const page = Number.parseInt(getValue('--page') || '1', 10);
  const pageSize = Number.parseInt(getValue('--page-size') || '5', 10);
  const maxAllowed503 = Number.parseInt(getValue('--max-allowed-503') || '0', 10);
  const requireStrictPolicy = parseBoolean(getValue('--require-strict-policy'), true);
  const requireVectorProfile = parseBoolean(getValue('--require-vector-profile'), true);
  const parityQueries = parseList(getValue('--parity-queries'), DEFAULT_PARITY_QUERIES);
  const strictQueries = parseList(getValue('--strict-queries'), DEFAULT_STRICT_QUERIES);

  if (!['all', 'parity', 'strict'].includes(mode)) {
    throw new Error(`Invalid --mode "${mode}". Expected: all|parity|strict`);
  }
  if (!['local', 'staging', 'prod'].includes(env)) {
    throw new Error(`Invalid --env "${env}". Expected: local|staging|prod`);
  }

  return {
    mode,
    env,
    baseUrl,
    authHeader,
    out,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 5,
    maxAllowed503: Number.isFinite(maxAllowed503) && maxAllowed503 >= 0 ? maxAllowed503 : 0,
    requireStrictPolicy,
    requireVectorProfile,
    parityQueries,
    strictQueries,
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

function resolveAuthHeader(args: ParsedArgs): Record<string, string> {
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

async function fetchJson(url: string, headers: Record<string, string>, timeoutMs: number): Promise<EndpointResponse> {
  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const rawText = await response.text();
    let body: any = {};
    try {
      body = rawText ? JSON.parse(rawText) : {};
    } catch {
      return {
        status: response.status,
        ok: response.ok,
        body: {},
        rawText,
        error: 'response was not valid JSON',
      };
    }
    return {
      status: response.status,
      ok: response.ok,
      body,
      rawText,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      body: {},
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function idsFromPayload(payload: any): string[] {
  if (!payload || !Array.isArray(payload.data)) return [];
  return payload.data
    .map((item: any) => item?.id)
    .filter((value: unknown): value is string => typeof value === 'string');
}

function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

async function runParityProbe(baseUrl: string, headers: Record<string, string>, args: ParsedArgs) {
  const samples: ParitySample[] = [];

  for (const query of args.parityQueries) {
    const params = new URLSearchParams({
      q: query,
      page: String(args.page),
      pageSize: String(args.pageSize),
    });

    const searchUrl = `${baseUrl}/api/search?${params.toString()}`;
    const ftsUrl = `${baseUrl}/api/search/fts?${params.toString()}`;
    const [searchResponse, ftsResponse] = await Promise.all([
      fetchJson(searchUrl, headers, args.timeoutMs),
      fetchJson(ftsUrl, headers, args.timeoutMs),
    ]);

    const idsSearch = idsFromPayload(searchResponse.body);
    const idsFts = idsFromPayload(ftsResponse.body);
    const sameIds = stableJson(idsSearch) === stableJson(idsFts);
    const samePagination = stableJson(searchResponse.body?.pagination) === stableJson(ftsResponse.body?.pagination);
    const sameNormalizedQuery =
      searchResponse.body?.query?.normalized === ftsResponse.body?.query?.normalized;

    samples.push({
      query,
      searchStatus: searchResponse.status,
      ftsStatus: ftsResponse.status,
      sameIds,
      samePagination,
      sameNormalizedQuery: Boolean(sameNormalizedQuery),
      idsSearch,
      idsFts,
    });
  }

  const failures = samples.filter(
    (sample) =>
      sample.searchStatus !== 200 ||
      sample.ftsStatus !== 200 ||
      !sample.sameIds ||
      !sample.samePagination ||
      !sample.sameNormalizedQuery
  );

  return {
    queryCount: args.parityQueries.length,
    failures: failures.length,
    pass: failures.length === 0,
    samples,
  };
}

async function runStrictProbe(baseUrl: string, headers: Record<string, string>, args: ParsedArgs) {
  const samples: StrictSample[] = [];

  let semantic503 = 0;
  let hybrid503 = 0;
  let semanticNon200 = 0;
  let hybridNon200 = 0;
  let policyDrift = 0;
  let vectorProfileMissing = 0;

  for (const query of args.strictQueries) {
    const params = new URLSearchParams({
      q: query,
      page: String(args.page),
      pageSize: String(args.pageSize),
    });

    const semanticUrl = `${baseUrl}/api/search/semantic?${params.toString()}`;
    const hybridUrl = `${baseUrl}/api/search/hybrid?${params.toString()}`;
    const [semanticResponse, hybridResponse] = await Promise.all([
      fetchJson(semanticUrl, headers, args.timeoutMs),
      fetchJson(hybridUrl, headers, args.timeoutMs),
    ]);

    if (semanticResponse.status === 503) semantic503++;
    if (hybridResponse.status === 503) hybrid503++;
    if (semanticResponse.status !== 200) semanticNon200++;
    if (hybridResponse.status !== 200) hybridNon200++;

    const semanticPolicyApplied = semanticResponse.body?.query?.searchPolicyApplied;
    const hybridPolicyApplied = hybridResponse.body?.query?.searchPolicyApplied;
    const semanticVectorProfileId = semanticResponse.body?.query?.vectorProfileId;
    const hybridVectorProfileId = hybridResponse.body?.query?.vectorProfileId;

    if (args.requireStrictPolicy) {
      if (semanticResponse.status === 200 && semanticPolicyApplied !== 'strict') policyDrift++;
      if (hybridResponse.status === 200 && hybridPolicyApplied !== 'strict') policyDrift++;
    }

    if (args.requireVectorProfile) {
      if (semanticResponse.status === 200 && typeof semanticVectorProfileId !== 'string') vectorProfileMissing++;
      if (hybridResponse.status === 200 && typeof hybridVectorProfileId !== 'string') vectorProfileMissing++;
    }

    samples.push({
      query,
      semanticStatus: semanticResponse.status,
      hybridStatus: hybridResponse.status,
      semanticPolicyApplied,
      hybridPolicyApplied,
      semanticVectorProfileId,
      hybridVectorProfileId,
    });
  }

  const strictPass =
    semantic503 <= args.maxAllowed503 &&
    hybrid503 <= args.maxAllowed503 &&
    semanticNon200 === 0 &&
    hybridNon200 === 0 &&
    policyDrift === 0 &&
    vectorProfileMissing === 0;

  return {
    queryCount: args.strictQueries.length,
    pass: strictPass,
    semantic503,
    hybrid503,
    semanticNon200,
    hybridNon200,
    policyDrift,
    vectorProfileMissing,
    samples,
  };
}

function maybeWriteOutput(outPath: string | undefined, report: any): void {
  if (!outPath) return;
  const abs = resolve(outPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(report, null, 2), 'utf8');
}

function printUsage(): void {
  console.log(`Usage: tsx scripts/probe-search-runtime.ts [options]

Options:
  --mode <all|parity|strict>          Probe mode (default: all)
  --env <local|staging|prod>          Target environment (default: local)
  --base-url <url>                    Override base URL
  --auth-header <header>              Optional auth header (e.g. "Authorization: Bearer ...")
  --out <path>                        Write JSON report to file
  --timeout-ms <n>                    Request timeout in ms (default: 15000)
  --page <n>                          Page for probes (default: 1)
  --page-size <n>                     Page size for probes (default: 5)
  --max-allowed-503 <n>               Strict probe allowed 503 count per endpoint (default: 0)
  --require-strict-policy <true|false> Require searchPolicyApplied=strict (default: true)
  --require-vector-profile <true|false> Require query.vectorProfileId on strict responses (default: true)
  --parity-queries <csv>              Override parity query corpus
  --strict-queries <csv>              Override strict query corpus
  --help                              Print this help text

Environment:
  STAGING_BASE_URL, PROD_BASE_URL, LOCAL_BASE_URL
  STAGING_AUTH_HEADER, PROD_AUTH_HEADER, LOCAL_AUTH_HEADER
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
  const authHeaders = resolveAuthHeader(args);
  const startedAt = new Date().toISOString();

  const report: any = {
    startedAt,
    completedAt: null,
    env: args.env,
    mode: args.mode,
    baseUrl,
    options: {
      page: args.page,
      pageSize: args.pageSize,
      maxAllowed503: args.maxAllowed503,
      requireStrictPolicy: args.requireStrictPolicy,
      requireVectorProfile: args.requireVectorProfile,
    },
    parity: null,
    strict: null,
    pass: true,
  };

  if (args.mode === 'all' || args.mode === 'parity') {
    report.parity = await runParityProbe(baseUrl, authHeaders, args);
    if (!report.parity.pass) report.pass = false;
  }

  if (args.mode === 'all' || args.mode === 'strict') {
    report.strict = await runStrictProbe(baseUrl, authHeaders, args);
    if (!report.strict.pass) report.pass = false;
  }

  report.completedAt = new Date().toISOString();
  maybeWriteOutput(args.out, report);

  console.log('\nSearch Runtime Probe Summary');
  console.log('----------------------------');
  console.log(`target=${baseUrl}`);
  console.log(`env=${args.env}, mode=${args.mode}`);
  if (report.parity) {
    console.log(
      `parity: pass=${report.parity.pass} failures=${report.parity.failures}/${report.parity.queryCount}`
    );
  }
  if (report.strict) {
    console.log(
      `strict: pass=${report.strict.pass} semantic503=${report.strict.semantic503} hybrid503=${report.strict.hybrid503} policyDrift=${report.strict.policyDrift} vectorProfileMissing=${report.strict.vectorProfileMissing}`
    );
  }
  if (args.out) {
    console.log(`report=${resolve(args.out)}`);
  }

  if (!report.pass) {
    console.error('\nProbe failed: one or more gates did not pass.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Probe failed unexpectedly:', error);
  process.exit(1);
});

