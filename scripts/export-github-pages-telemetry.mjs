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

const inputPath = resolve(parseOption('input', 'web-react/src/data/github-pages.json'));
const outputPath = resolve(parseOption('output', '.test-tmp/github-pages-telemetry.json'));
const maxAgeHours = Number.parseFloat(parseOption('max-age-hours', '72'));
const maxErrored = Number.parseInt(parseOption('max-errored', '8'), 10);
const maxUnreachable = Number.parseInt(parseOption('max-unreachable', '5'), 10);

const telemetry = buildGitHubPagesTelemetry({
  inputPath,
  maxAgeHours: Number.isFinite(maxAgeHours) ? maxAgeHours : 72,
  maxErrored: Number.isFinite(maxErrored) ? maxErrored : 8,
  maxUnreachable: Number.isFinite(maxUnreachable) ? maxUnreachable : 5,
});

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(telemetry, null, 2) + '\n');

console.log(`GitHub Pages telemetry written: ${outputPath}`);
console.log(`- syncStatus: ${telemetry.syncStatus}`);
console.log(`- repos: ${telemetry.totals.repos}`);
console.log(`- errored: ${telemetry.totals.errored}`);
console.log(`- unreachable: ${telemetry.totals.unreachable}`);
if (typeof telemetry.ageHours === 'number') {
  console.log(`- ageHours: ${telemetry.ageHours.toFixed(2)}`);
}
