#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildGitHubPagesTelemetry } from '@meta-organvm/github-pages-index-core';

const args = process.argv.slice(2);

function parseOption(name, fallback = null) {
  const prefix = `--${name}=`;
  const eq = args.find((entry) => entry.startsWith(prefix));
  if (eq) return eq.slice(prefix.length) || fallback;

  const index = args.indexOf(`--${name}`);
  if (index >= 0) return args[index + 1] ?? fallback;
  return fallback;
}

function boolFlag(name) {
  return args.includes(`--${name}`);
}

function isoHoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function parseRepo(repository) {
  if (!repository || !repository.includes('/')) return null;
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) return null;
  return { owner, repo };
}

async function githubRequest(baseUrl, token, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`GitHub API ${response.status} ${path}${body ? `: ${body.slice(0, 240)}` : ''}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function searchIssues(baseUrl, token, query) {
  const payload = await githubRequest(
    baseUrl,
    token,
    `/search/issues?q=${encodeURIComponent(query)}&per_page=100`
  );
  return Array.isArray(payload?.items) ? payload.items : [];
}

async function findOpenIssueExact(baseUrl, token, repository, title) {
  const candidates = await searchIssues(
    baseUrl,
    token,
    `repo:${repository} is:issue is:open in:title "${title}"`
  );
  return candidates.find((entry) => entry.title === title) ?? null;
}

async function createIssue(baseUrl, token, owner, repo, title, body) {
  return githubRequest(baseUrl, token, `/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    body: { title, body },
  });
}

async function createComment(baseUrl, token, owner, repo, issueNumber, body) {
  return githubRequest(baseUrl, token, `/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: 'POST',
    body: { body },
  });
}

async function upsertIssue(baseUrl, token, owner, repo, repository, title, body, comment) {
  const existing = await findOpenIssueExact(baseUrl, token, repository, title);
  if (existing) {
    if (comment) {
      await createComment(baseUrl, token, owner, repo, existing.number, comment);
    }
    return { number: existing.number, created: false };
  }

  const created = await createIssue(baseUrl, token, owner, repo, title, body);
  if (comment) {
    await createComment(baseUrl, token, owner, repo, created.number, comment);
  }
  return { number: created.number, created: true };
}

async function countFallbackEventsInWindow(baseUrl, token, repository, sinceIso) {
  const items = await searchIssues(
    baseUrl,
    token,
    `repo:${repository} is:issue in:title "[GitHub Pages][Fallback Event]" created:>=${sinceIso}`
  );
  return items.filter((entry) => entry.title.includes('[GitHub Pages][Fallback Event]')).length;
}

async function main() {
  const inputPath = resolve(parseOption('input', 'web-react/src/data/github-pages.json'));
  const outputPath = resolve(parseOption('output', '.test-tmp/github-pages-alerts.json'));
  const maxErrored = Number.parseInt(parseOption('max-errored', '8'), 10) || 8;
  const maxUnreachable = Number.parseInt(parseOption('max-unreachable', '5'), 10) || 5;
  const maxAgeHours = Number.parseFloat(parseOption('max-age-hours', '72')) || 72;
  const windowHours = Number.parseInt(parseOption('window-hours', '24'), 10) || 24;
  const strict = boolFlag('strict');

  const telemetry = buildGitHubPagesTelemetry({
    inputPath,
    maxAgeHours,
    maxErrored,
    maxUnreachable,
  });

  const token =
    (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) ||
    (process.env.GH_TOKEN && process.env.GH_TOKEN.trim()) ||
    null;
  const repository = process.env.GITHUB_REPOSITORY || '';
  const repoParts = parseRepo(repository);
  const baseUrl = process.env.GITHUB_API_URL || 'https://api.github.com';
  const sinceIso = isoHoursAgo(windowHours);

  const summary = {
    generatedAt: new Date().toISOString(),
    inputPath,
    telemetry,
    windowHours,
    alertsTriggered: [],
    notes: [],
    dryRun: false,
  };

  if (!token || !repoParts) {
    summary.notes.push('Skipped: missing GITHUB_TOKEN/GH_TOKEN or GITHUB_REPOSITORY.');
    summary.dryRun = true;
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(summary, null, 2) + '\n');
    console.log(`GitHub Pages alert summary written: ${outputPath}`);
    return;
  }

  const contextLine = [
    `run=${process.env.GITHUB_RUN_ID ?? 'local'}`,
    `workflow=${process.env.GITHUB_WORKFLOW ?? 'local'}`,
    `syncStatus=${telemetry.syncStatus}`,
    `errored=${telemetry.totals.errored}`,
    `unreachable=${telemetry.totals.unreachable}`,
  ].join(' ');

  try {
    if (telemetry.syncStatus === 'fallback') {
      const fallbackTitle = `[GitHub Pages][Fallback Event] ${new Date().toISOString()}`;
      const fallbackBody = [
        'Fallback sync detected.',
        '',
        `- Repository: ${repository}`,
        `- ${contextLine}`,
        `- Source: \`${inputPath}\``,
      ].join('\n');

      await createIssue(baseUrl, token, repoParts.owner, repoParts.repo, fallbackTitle, fallbackBody);

      const eventsInWindow = await countFallbackEventsInWindow(baseUrl, token, repository, sinceIso);
      summary.notes.push(`Fallback events in ${windowHours}h: ${eventsInWindow}`);

      if (eventsInWindow > 1) {
        const title = `[GitHub Pages][Alert] Repeated fallback in ${windowHours}h`;
        const body = [
          'GitHub Pages sync entered fallback mode more than once within the alert window.',
          '',
          `- Repository: ${repository}`,
          `- Window: ${windowHours}h`,
          `- Events: ${eventsInWindow}`,
          `- ${contextLine}`,
          `- Threshold policy: max-errored=${maxErrored}, max-unreachable=${maxUnreachable}`,
        ].join('\n');

        await upsertIssue(
          baseUrl,
          token,
          repoParts.owner,
          repoParts.repo,
          repository,
          title,
          body,
          `Observed repeated fallback. ${contextLine}`
        );

        summary.alertsTriggered.push('repeated-fallback-24h');
      }
    }

    if (telemetry.totals.errored > maxErrored) {
      const title = '[GitHub Pages][Alert] Errored repos exceed budget';
      const body = [
        'GitHub Pages errored repository count exceeded policy budget.',
        '',
        `- Repository: ${repository}`,
        `- Errored: ${telemetry.totals.errored}`,
        `- Budget: ${maxErrored}`,
        `- ${contextLine}`,
      ].join('\n');

      await upsertIssue(
        baseUrl,
        token,
        repoParts.owner,
        repoParts.repo,
        repository,
        title,
        body,
        `Budget breach persists. ${contextLine}`
      );

      summary.alertsTriggered.push('errored-budget-breach');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    summary.notes.push(`GitHub alert API call failed: ${message}`);
    if (strict) {
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, JSON.stringify(summary, null, 2) + '\n');
      throw error;
    }
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(summary, null, 2) + '\n');

  console.log(`GitHub Pages alert summary written: ${outputPath}`);
  if (summary.alertsTriggered.length > 0) {
    console.log(`Alerts triggered: ${summary.alertsTriggered.join(', ')}`);
  } else {
    console.log('Alerts triggered: none');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
