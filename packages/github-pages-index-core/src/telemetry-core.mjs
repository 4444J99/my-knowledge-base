import { readFileSync } from 'node:fs';

function isFiniteDateString(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

export function parseGitHubPagesIndex(inputPath) {
  const payload = JSON.parse(readFileSync(inputPath, 'utf-8'));
  const repos = Array.isArray(payload?.repos) ? payload.repos : [];

  const generatedAtMs = isFiniteDateString(payload?.generatedAt)
    ? Date.parse(payload.generatedAt)
    : null;

  return {
    payload,
    repos,
    generatedAtMs,
    generatedAtIso: typeof payload?.generatedAt === 'string' ? payload.generatedAt : null,
    syncStatus: typeof payload?.syncStatus === 'string' ? payload.syncStatus : 'unknown',
    totalRepos: repos.length,
    builtCount: repos.filter((repo) => repo?.status === 'built').length,
    erroredCount: repos.filter((repo) => repo?.status === 'errored').length,
    unreachableCount: repos.filter((repo) => repo?.reachable === false).length,
  };
}

export function buildGitHubPagesTelemetry({
  inputPath,
  maxAgeHours = 72,
  maxErrored = 8,
  maxUnreachable = 5,
}) {
  const parsed = parseGitHubPagesIndex(inputPath);
  const ageHours = parsed.generatedAtMs === null ? null : (Date.now() - parsed.generatedAtMs) / (1000 * 60 * 60);
  const stale = typeof ageHours === 'number' && ageHours > maxAgeHours;

  return {
    generatedAt: new Date().toISOString(),
    sourcePath: inputPath,
    indexGeneratedAt: parsed.generatedAtIso,
    syncStatus: parsed.syncStatus,
    totals: {
      repos: parsed.totalRepos,
      built: parsed.builtCount,
      errored: parsed.erroredCount,
      unreachable: parsed.unreachableCount,
    },
    thresholds: {
      maxAgeHours,
      maxErrored,
      maxUnreachable,
    },
    budgetStatus: {
      stale,
      erroredExceeded: parsed.erroredCount > maxErrored,
      unreachableExceeded: parsed.unreachableCount > maxUnreachable,
    },
    ageHours,
  };
}
