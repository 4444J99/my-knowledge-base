#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const API_BASE = 'https://api.github.com';
const DEFAULT_OUTPUT = 'web-react/src/data/github-pages.json';
const DEFAULT_OWNERS = [
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

const args = process.argv.slice(2);

function parseOption(name, fallback = null) {
  const prefix = `--${name}=`;
  const eq = args.find((entry) => entry.startsWith(prefix));
  if (eq) return eq.slice(prefix.length) || fallback;

  const index = args.indexOf(`--${name}`);
  if (index >= 0) return args[index + 1] ?? fallback;

  return fallback;
}

function parseOwners(value) {
  if (!value) return null;
  const owners = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return owners.length > 0 ? owners : null;
}

function parseNextLink(headerValue) {
  if (!headerValue) return null;
  const links = headerValue.split(',');
  for (const raw of links) {
    const [urlPart, ...rest] = raw.split(';').map((segment) => segment.trim());
    if (!urlPart?.startsWith('<') || !urlPart.endsWith('>')) continue;
    if (!rest.includes('rel="next"')) continue;
    return urlPart.slice(1, -1);
  }
  return null;
}

function buildHeaders() {
  const token =
    (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) ||
    (process.env.GH_TOKEN && process.env.GH_TOKEN.trim()) ||
    null;

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'github-pages-sync-script',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function fetchPaginatedArray(url, headers) {
  const items = [];
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

    if (response.status === 404) {
      return { ok: true, items: [] };
    }

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

    items.push(...payload);
    nextUrl = parseNextLink(response.headers.get('link'));
  }

  return { ok: true, items };
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

function compareRepoIdentity(a, b) {
  const ownerOrder = a.owner.localeCompare(b.owner, undefined, { sensitivity: 'base' });
  if (ownerOrder !== 0) return ownerOrder;
  return a.repo.localeCompare(b.repo, undefined, { sensitivity: 'base' });
}

function handleFailures({ errors, strict, outputPath }) {
  if (errors.length === 0) return false;

  console.error('\nGitHub Pages sync encountered errors:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }

  if (strict) {
    process.exit(1);
  }

  if (existsSync(outputPath)) {
    console.warn(`\nKeeping existing data at ${outputPath} (non-strict mode).`);
    process.exit(0);
  }

  console.error(`\nNo existing output found at ${outputPath}; cannot fall back.`);
  process.exit(1);
}

async function main() {
  const strict = args.includes('--strict');
  const owners = parseOwners(parseOption('owners', null)) ?? DEFAULT_OWNERS;
  const outputPath = resolve(parseOption('output', DEFAULT_OUTPUT));

  if (owners.length === 0) {
    console.error('At least one owner is required. Pass --owners owner1,owner2');
    process.exit(1);
  }

  const headers = buildHeaders();
  const errors = [];
  const reposByFullName = new Map();

  for (const owner of owners) {
    const encodedOwner = encodeURIComponent(owner);
    const repoEndpoints = [
      `${API_BASE}/users/${encodedOwner}/repos?per_page=100&type=owner&sort=updated`,
      `${API_BASE}/orgs/${encodedOwner}/repos?per_page=100&type=public&sort=updated`,
    ];

    for (const endpoint of repoEndpoints) {
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

  handleFailures({ errors, strict, outputPath });

  const reposWithPages = Array.from(reposByFullName.values())
    .filter((repo) => repo?.has_pages === true)
    .sort((a, b) =>
      compareRepoIdentity(
        {
          owner: a?.owner?.login ?? '',
          repo: a?.name ?? '',
        },
        {
          owner: b?.owner?.login ?? '',
          repo: b?.name ?? '',
        }
      )
    );

  const normalizedRepos = [];

  for (const repo of reposWithPages) {
    const owner = repo?.owner?.login;
    const name = repo?.name;
    if (typeof owner !== 'string' || typeof name !== 'string') {
      errors.push(`Skipping malformed repo payload for ${repo?.full_name ?? 'unknown'}`);
      continue;
    }

    const pagesUrl = `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pages`;
    const pageResult = await fetchJsonObject(pagesUrl, headers);

    if (!pageResult.ok) {
      errors.push(pageResult.error);
      continue;
    }

    const pages = pageResult.payload;
    const pageUrl = typeof pages.html_url === 'string' ? pages.html_url : null;

    if (!pageUrl) {
      errors.push(`Missing html_url in Pages response for ${owner}/${name}`);
      continue;
    }

    normalizedRepos.push({
      owner,
      repo: name,
      fullName: `${owner}/${name}`,
      repoUrl: typeof repo.html_url === 'string' ? repo.html_url : `https://github.com/${owner}/${name}`,
      pageUrl,
      status: pages.status ?? null,
      buildType: pages.build_type ?? null,
      cname: pages.cname ?? null,
      sourceBranch: pages.source?.branch ?? null,
      sourcePath: pages.source?.path ?? null,
      updatedAt: repo.updated_at ?? null,
    });
  }

  handleFailures({ errors, strict, outputPath });

  normalizedRepos.sort(compareRepoIdentity);

  const output = {
    generatedAt: new Date().toISOString(),
    owners,
    totalRepos: normalizedRepos.length,
    repos: normalizedRepos,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');

  console.log(`Synced ${output.totalRepos} GitHub Pages repositories.`);
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
