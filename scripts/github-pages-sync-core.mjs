import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const SYNC_CORE_VERSION = '2.0.0';

export const DEFAULT_OWNERS = [
  '4444J99',
  'organvm-i-theoria',
  'organvm-ii-poiesis',
  'organvm-iii-ergon',
  'organvm-iv-taxis',
  'organvm-v-logos',
  'organvm-vi-koinonia',
  'organvm-vii-kerygma',
  'meta-organvm',
];

const GITHUB_API_BASE = 'https://api.github.com';

function parseNextLink(linkHeader) {
  if (!linkHeader) return null;
  const parts = linkHeader.split(',');
  for (const part of parts) {
    const [urlPart, ...meta] = part.split(';').map((segment) => segment.trim());
    if (!urlPart?.startsWith('<') || !urlPart.endsWith('>')) continue;
    if (!meta.includes('rel="next"')) continue;
    return urlPart.slice(1, -1);
  }
  return null;
}

function createApiHeaders() {
  const token =
    (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) ||
    (process.env.GH_TOKEN && process.env.GH_TOKEN.trim()) ||
    null;

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'github-pages-sync-core',
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function readJsonIfExists(filePath) {
  if (!filePath || !existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function normalizeNumber(value, fallback = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return value;
}

function normalizeStringOrNull(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeCurationMap(curationPayload) {
  const rawOverrides =
    curationPayload &&
    typeof curationPayload === 'object' &&
    !Array.isArray(curationPayload) &&
    curationPayload.overrides &&
    typeof curationPayload.overrides === 'object' &&
    !Array.isArray(curationPayload.overrides)
      ? curationPayload.overrides
      : curationPayload && typeof curationPayload === 'object' && !Array.isArray(curationPayload)
      ? curationPayload
      : {};

  const entries = Object.entries(rawOverrides);
  const map = new Map();

  for (const [key, rawValue] of entries) {
    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) continue;
    const override = {
      featured: normalizeBoolean(rawValue.featured, false),
      priority: normalizeNumber(rawValue.priority, 0),
      hidden: normalizeBoolean(
        rawValue.hidden !== undefined ? rawValue.hidden : rawValue.hide,
        false
      ),
      label: normalizeStringOrNull(rawValue.label),
    };
    map.set(key.toLowerCase(), override);
  }

  return map;
}

function compareRepoIdentity(a, b) {
  const ownerOrder = a.owner.localeCompare(b.owner, undefined, { sensitivity: 'base' });
  if (ownerOrder !== 0) return ownerOrder;
  return a.repo.localeCompare(b.repo, undefined, { sensitivity: 'base' });
}

async function fetchPaginatedArray(url, headers) {
  const collected = [];
  let nextUrl = url;

  while (nextUrl) {
    let response;
    try {
      response = await fetch(nextUrl, { headers });
    } catch (error) {
      return {
        ok: false,
        error: `Network error for ${nextUrl}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    if (response.status === 404) return { ok: true, items: [] };

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return {
        ok: false,
        error: `GitHub API ${response.status} for ${nextUrl}${body ? `: ${body.slice(0, 220)}` : ''}`,
      };
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
      return { ok: false, error: `Expected array response for ${nextUrl}` };
    }

    collected.push(...payload);
    nextUrl = parseNextLink(response.headers.get('link'));
  }

  return { ok: true, items: collected };
}

async function fetchJsonObject(url, headers) {
  let response;
  try {
    response = await fetch(url, { headers });
  } catch (error) {
    return {
      ok: false,
      error: `Network error for ${url}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    return {
      ok: false,
      error: `GitHub API ${response.status} for ${url}${body ? `: ${body.slice(0, 220)}` : ''}`,
    };
  }

  const payload = await response.json();
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, error: `Expected object response for ${url}` };
  }
  return { ok: true, payload };
}

async function probePageHealth(pageUrl, timeoutMs = 8000) {
  const checkedAt = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(pageUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'github-pages-health-probe' },
    });

    const finalUrl = typeof response.url === 'string' ? response.url : '';
    const status = Number.isFinite(response.status) ? response.status : null;
    const reachable = status !== null && status >= 200 && status < 500;

    return {
      httpStatus: status,
      reachable,
      redirectTarget: finalUrl && finalUrl !== pageUrl ? finalUrl : null,
      lastCheckedAt: checkedAt,
    };
  } catch {
    return {
      httpStatus: null,
      reachable: false,
      redirectTarget: null,
      lastCheckedAt: checkedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function syncGitHubPagesDirectory({
  owners,
  outputPath,
  strict = false,
  curationPath = null,
  probeTimeoutMs = 8000,
  logger = console,
}) {
  if (!Array.isArray(owners) || owners.length === 0) {
    throw new Error('At least one owner is required.');
  }
  if (!outputPath) {
    throw new Error('outputPath is required.');
  }

  const headers = createApiHeaders();
  const curationPayload = readJsonIfExists(curationPath);
  const curationMap = normalizeCurationMap(curationPayload);
  const errors = [];
  const reposByFullName = new Map();

  for (const owner of owners) {
    const encodedOwner = encodeURIComponent(owner);
    const endpoints = [
      `${GITHUB_API_BASE}/users/${encodedOwner}/repos?per_page=100&type=owner&sort=updated`,
      `${GITHUB_API_BASE}/orgs/${encodedOwner}/repos?per_page=100&type=public&sort=updated`,
    ];

    for (const endpoint of endpoints) {
      const result = await fetchPaginatedArray(endpoint, headers);
      if (!result.ok) {
        errors.push(result.error);
        continue;
      }

      for (const repo of result.items) {
        if (!repo || typeof repo !== 'object') continue;
        const fullName = typeof repo.full_name === 'string' ? repo.full_name : null;
        if (!fullName) continue;
        reposByFullName.set(fullName.toLowerCase(), repo);
      }
    }
  }

  if (errors.length > 0) {
    logger.error('\nGitHub Pages sync encountered errors:');
    for (const error of errors) logger.error(`- ${error}`);

    if (strict || !existsSync(outputPath)) {
      return { ok: false, usedFallback: false, errors };
    }

    logger.warn(`\nKeeping existing data at ${outputPath} (non-strict mode fallback).`);
    return { ok: true, usedFallback: true, errors };
  }

  const reposWithPages = Array.from(reposByFullName.values())
    .filter((repo) => repo?.has_pages === true)
    .sort((a, b) =>
      compareRepoIdentity(
        { owner: a?.owner?.login ?? '', repo: a?.name ?? '' },
        { owner: b?.owner?.login ?? '', repo: b?.name ?? '' }
      )
    );

  const normalizedRepos = [];

  for (const repo of reposWithPages) {
    const owner = repo?.owner?.login;
    const name = repo?.name;
    if (typeof owner !== 'string' || typeof name !== 'string') continue;

    const pagesUrl = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pages`;
    const pagesResult = await fetchJsonObject(pagesUrl, headers);

    if (!pagesResult.ok) {
      errors.push(pagesResult.error);
      continue;
    }

    const pages = pagesResult.payload;
    const pageUrl = typeof pages.html_url === 'string' ? pages.html_url : null;
    if (!pageUrl) {
      errors.push(`Missing html_url in Pages response for ${owner}/${name}`);
      continue;
    }

    const fullName = `${owner}/${name}`;
    const curation = curationMap.get(fullName.toLowerCase()) ?? {
      featured: false,
      priority: 0,
      hidden: false,
      label: null,
    };
    const health = await probePageHealth(pageUrl, probeTimeoutMs);

    normalizedRepos.push({
      owner,
      repo: name,
      fullName,
      repoUrl: typeof repo.html_url === 'string' ? repo.html_url : `https://github.com/${fullName}`,
      pageUrl,
      status: pages.status ?? null,
      buildType: pages.build_type ?? null,
      cname: pages.cname ?? null,
      sourceBranch: pages.source?.branch ?? null,
      sourcePath: pages.source?.path ?? null,
      updatedAt: repo.updated_at ?? null,
      featured: curation.featured,
      priority: curation.priority,
      hidden: curation.hidden,
      label: curation.label,
      ...health,
    });
  }

  if (errors.length > 0) {
    logger.error('\nGitHub Pages sync encountered errors:');
    for (const error of errors) logger.error(`- ${error}`);

    if (strict || !existsSync(outputPath)) {
      return { ok: false, usedFallback: false, errors };
    }

    logger.warn(`\nKeeping existing data at ${outputPath} (non-strict mode fallback).`);
    return { ok: true, usedFallback: true, errors };
  }

  normalizedRepos.sort(compareRepoIdentity);

  const output = {
    schemaVersion: 'github-pages-index.v2',
    syncCoreVersion: SYNC_CORE_VERSION,
    generatedAt: new Date().toISOString(),
    owners,
    totalRepos: normalizedRepos.length,
    repos: normalizedRepos,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');

  return {
    ok: true,
    usedFallback: false,
    totalRepos: output.totalRepos,
    outputPath,
    errors: [],
  };
}
