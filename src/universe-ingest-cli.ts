#!/usr/bin/env node
import Database from 'better-sqlite3';
import { UniverseStore } from './universe/store.js';
import { UniverseIngestService } from './universe/ingest.js';

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const entry = process.argv.find((arg) => arg.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const dbPath = process.env.KNOWLEDGE_DB_PATH || './db/knowledge.db';
const rootDir = parseArg('root') || 'intake';
const limitValue = parseArg('limit');
const reportDir = parseArg('report-dir') || 'intake/reports';
const save = hasFlag('save');

const limit = limitValue ? Number.parseInt(limitValue, 10) : undefined;
if (limitValue && (!Number.isFinite(limit) || (limit as number) <= 0)) {
  console.error(`Invalid --limit value: ${limitValue}`);
  process.exit(1);
}

const db = new Database(dbPath);

try {
  const store = new UniverseStore(db);
  const ingest = new UniverseIngestService(store);

  const report = ingest.run({
    rootDir,
    limit,
    save,
    reportDir,
  });

  console.log(JSON.stringify(report, null, 2));
} finally {
  db.close();
}
