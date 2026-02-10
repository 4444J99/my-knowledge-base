#!/usr/bin/env node

/**
 * Backfill docs/RELEASE_INDEX.md with concrete release workflow metadata.
 * Requires authenticated GitHub CLI (`gh`).
 */

import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { spawnSync } from 'child_process';

config();

interface WorkflowRun {
  databaseId: number;
  headBranch: string;
  headSha: string;
  status: string;
  conclusion: string;
  url: string;
  createdAt: string;
}

interface ReleaseView {
  tagName: string;
  body?: string;
}

interface RunJob {
  name: string;
  status: string;
  conclusion: string | null;
}

function runCommand(command: string, args: string[]): string {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    const stdout = (result.stdout || '').trim();
    throw new Error(`${command} ${args.join(' ')} failed: ${stderr || stdout}`);
  }
  return result.stdout.trim();
}

function runGhJson<T>(args: string[]): T {
  const output = runCommand('gh', args);
  return JSON.parse(output) as T;
}

function parseArgs(argv: string[]): { path: string; dryRun: boolean } {
  const getValue = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    if (idx < 0) return undefined;
    return argv[idx + 1];
  };

  return {
    path: getValue('--path') || 'docs/RELEASE_INDEX.md',
    dryRun: argv.includes('--dry-run'),
  };
}

function extractTag(cell: string): string | null {
  const cleaned = cell.replace(/`/g, '').trim();
  return cleaned.startsWith('v') ? cleaned : null;
}

function extractImageRef(body: string | undefined): string | undefined {
  if (!body) return undefined;
  const match = body.match(/docker pull\s+([^\s`]+)/i);
  return match?.[1];
}

function findJobStatus(jobs: RunJob[], matcher: RegExp): string {
  const job = jobs.find((item) => matcher.test(item.name));
  if (!job) return 'not present in workflow at tag';
  if (job.conclusion) return job.conclusion;
  return job.status || 'unknown';
}

function formatRow(cells: string[]): string {
  return `| ${cells.join(' | ')} |`;
}

function getHeadShortSha(): string {
  return runCommand('git', ['rev-parse', '--short', 'HEAD']);
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes('--help')) {
    console.log(`Usage: tsx scripts/backfill-release-index.ts [--dry-run] [--path docs/RELEASE_INDEX.md]`);
    process.exit(0);
  }

  const args = parseArgs(argv);
  const path = resolve(args.path);
  const content = readFileSync(path, 'utf8');
  const lines = content.split('\n');

  const runs = runGhJson<WorkflowRun[]>([
    'run',
    'list',
    '--workflow',
    'Release',
    '--limit',
    '100',
    '--json',
    'databaseId,headBranch,headSha,status,conclusion,url,createdAt',
  ]);
  const runByTag = new Map<string, WorkflowRun>(runs.map((run) => [run.headBranch, run]));
  const runJobsCache = new Map<number, RunJob[]>();
  const releaseImageCache = new Map<string, string | undefined>();

  const getJobs = (runId: number): RunJob[] => {
    const cached = runJobsCache.get(runId);
    if (cached) return cached;
    const response = runGhJson<{ jobs: RunJob[] }>(['run', 'view', String(runId), '--json', 'jobs']);
    const jobs = response.jobs || [];
    runJobsCache.set(runId, jobs);
    return jobs;
  };

  const getImageRef = (tag: string): string | undefined => {
    if (releaseImageCache.has(tag)) return releaseImageCache.get(tag);
    try {
      const release = runGhJson<ReleaseView>(['release', 'view', tag, '--json', 'tagName,body']);
      const image = extractImageRef(release.body);
      releaseImageCache.set(tag, image);
      return image;
    } catch {
      releaseImageCache.set(tag, undefined);
      return undefined;
    }
  };

  let updatedRows = 0;
  const headShort = getHeadShortSha();

  const nextLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) return line;

    const cells = trimmed
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim());

    // Update unreleased head row.
    if (cells[0] === '`master`' && cells.length === 3) {
      if (cells[1] !== `\`${headShort}\``) {
        cells[1] = `\`${headShort}\``;
        updatedRows++;
      }
      return formatRow(cells);
    }

    const tag = extractTag(cells[0] || '');
    if (!tag) return line;

    const run = runByTag.get(tag);
    if (!run) return line;

    const jobs = getJobs(run.databaseId);
    const strictStatus = findJobStatus(jobs, /Strict Semantic Readiness|readiness/i);
    const parityStatus = findJobStatus(jobs, /Parity Smoke|parity/i);
    const imageRef = getImageRef(tag);

    if (cells.length >= 6) {
      cells[3] = `\`${run.databaseId}\``;
      cells[4] = strictStatus;
      cells[5] = parityStatus;
    }

    // Active release table includes image-ref column.
    if (cells.length >= 8) {
      if (imageRef) {
        cells[6] = `\`${imageRef}\``;
      }
      if (/pending backfill/i.test(cells[7]) || !cells[7]) {
        cells[7] = run.url;
      } else if (!cells[7].includes(run.url)) {
        cells[7] = `${cells[7]}; ${run.url}`;
      }
    }

    // Historical table has no image-ref column, so attach image to notes.
    if (cells.length === 7) {
      if (imageRef && !cells[6].includes('image=`')) {
        cells[6] = `${cells[6]}${cells[6] ? '; ' : ''}image=\`${imageRef}\``;
      }
      if (!cells[6].includes(run.url)) {
        cells[6] = `${cells[6]}${cells[6] ? '; ' : ''}${run.url}`;
      }
    }

    updatedRows++;
    return formatRow(cells);
  });

  const nextContent = nextLines.join('\n');
  if (!args.dryRun) {
    writeFileSync(path, nextContent, 'utf8');
  }

  console.log(`Release index backfill ${args.dryRun ? 'preview' : 'write'} complete.`);
  console.log(`path=${path}`);
  console.log(`rowsUpdated=${updatedRows}`);
}

try {
  main();
} catch (error) {
  console.error('Release index backfill failed:', error);
  process.exit(1);
}

