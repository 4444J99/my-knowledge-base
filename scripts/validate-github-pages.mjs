#!/usr/bin/env node

import { resolve } from 'node:path';
import { validateGitHubPagesIndex } from '@meta-organvm/github-pages-index-core';

const args = process.argv.slice(2);

function parseOption(name, fallback = null) {
  const prefix = `--${name}=`;
  const eq = args.find((entry) => entry.startsWith(prefix));
  if (eq) return eq.slice(prefix.length) || fallback;

  const index = args.indexOf(`--${name}`);
  if (index >= 0) return args[index + 1] ?? fallback;
  return fallback;
}

const inputPath = resolve(parseOption('input', 'web-react/src/data/github-pages.json'));
const maxAgeHours = Number.parseFloat(parseOption('max-age-hours', '48'));
const maxErrored = Number.parseInt(parseOption('max-errored', '25'), 10);
const maxUnreachable = Number.parseInt(parseOption('max-unreachable', '25'), 10);

const result = validateGitHubPagesIndex({
  inputPath,
  maxAgeHours: Number.isFinite(maxAgeHours) ? maxAgeHours : 48,
  maxErrored: Number.isFinite(maxErrored) ? maxErrored : 25,
  maxUnreachable: Number.isFinite(maxUnreachable) ? maxUnreachable : 25,
});

if (result.summary) {
  console.log(`GitHub Pages index summary (${inputPath}):`);
  console.log(`- total: ${result.summary.totalRepos}`);
  console.log(`- built: ${result.summary.builtCount}`);
  console.log(`- errored: ${result.summary.erroredCount}`);
  console.log(`- unreachable: ${result.summary.unreachableCount}`);
  console.log(`- recently changed (7d): ${result.summary.recentlyChangedCount}`);
  if (typeof result.summary.ageHours === 'number') {
    console.log(
      `- age: ${result.summary.ageHours.toFixed(2)}h (max ${result.summary.maxAgeHours}h)`
    );
  } else {
    console.log(`- age: n/a (max ${result.summary.maxAgeHours}h)`);
  }
}

for (const warning of result.warnings) console.warn(`Warning: ${warning}`);

if (!result.ok) {
  console.error('GitHub Pages index validation failed:');
  for (const error of result.errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('GitHub Pages index validation passed.');
