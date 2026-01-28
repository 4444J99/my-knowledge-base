/**
 * Watcher smoke test.
 * Simulates a single watch cycle against a temporary database and output dirs.
 */

import fs from 'fs';
import path from 'path';
import { KnowledgeAtomizer } from '../src/atomizer.js';
import { KnowledgeDatabase } from '../src/database.js';
import { MarkdownWriter } from '../src/markdown-writer.js';
import { JSONWriter } from '../src/json-writer.js';
import { KnowledgeDocument } from '../src/types.js';

const TMP_ROOT = path.join(process.cwd(), '.test-tmp', 'watch-smoke');
const TMP_DB = path.join(TMP_ROOT, 'knowledge.db');
const TMP_MD = path.join(TMP_ROOT, 'atomized', 'markdown');
const TMP_JSON = path.join(TMP_ROOT, 'atomized', 'json');

function resetTmp() {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  fs.mkdirSync(TMP_MD, { recursive: true });
  fs.mkdirSync(TMP_JSON, { recursive: true });
}

function buildSampleDoc(): KnowledgeDocument {
  const now = new Date();
  const content = [
    '<h1>Smoke Test</h1>',
    '<p>' + 'This is a watcher smoke test document. '.repeat(40) + '</p>',
    '<h2>Details</h2>',
    '<ul><li>First item</li><li>Second item</li></ul>',
    '<p>' + 'Additional detail text for chunking. '.repeat(50) + '</p>',
  ].join('\n');

  return {
    id: 'watch-smoke-doc',
    title: 'Watcher Smoke Test Doc',
    content,
    created: now,
    modified: now,
    format: 'html',
    metadata: {
      sourceId: 'watch-smoke',
      sourceName: 'Watcher Smoke',
      filePath: '/tmp/watch-smoke.html',
    },
  };
}

async function main() {
  console.log('🧪 Watcher smoke test starting...');
  resetTmp();

  const db = new KnowledgeDatabase(TMP_DB);
  const atomizer = new KnowledgeAtomizer();
  const markdownWriter = new MarkdownWriter(TMP_MD);
  const jsonWriter = new JSONWriter(TMP_JSON);

  try {
    const doc = buildSampleDoc();
    db.insertDocument(doc);
    const units = atomizer.atomizeDocument(doc);
    units.forEach((u) => db.insertAtomicUnit(u));
    markdownWriter.writeUnits(units);
    jsonWriter.writeUnits(units);
    jsonWriter.appendToJSONL(units);

    const unitCount = db.getUnitCountForDocument(doc.id);
    console.log(`✅ Smoke test completed. Units created: ${unitCount}`);
    console.log(`   Temp DB: ${TMP_DB}`);
  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error('❌ Watcher smoke test failed:', err);
  process.exit(1);
});

