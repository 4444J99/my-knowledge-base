#!/usr/bin/env node
/**
 * Search the knowledge base
 */

import { KnowledgeDatabase } from './database.js';

async function main() {
  const args = process.argv.slice(2);
  let sourceFilter: string | null = null;
  let formatFilter: string | null = null;
  const queryArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--source' && args[i + 1]) {
      sourceFilter = args[++i];
      continue;
    }
    if (arg.startsWith('--source=')) {
      sourceFilter = arg.slice('--source='.length);
      continue;
    }
    if (arg === '--format' && args[i + 1]) {
      formatFilter = args[++i];
      continue;
    }
    if (arg.startsWith('--format=')) {
      formatFilter = arg.slice('--format='.length);
      continue;
    }
    if (arg.startsWith('--')) {
      continue;
    }
    queryArgs.push(arg);
  }

  if (queryArgs.length === 0) {
    console.log('Usage: npm run search <query> [--source=<id>|claude] [--format=markdown|txt|pdf|html]');
    console.log('Example: npm run search "OAuth implementation" --source=local-1 --format=pdf');
    process.exit(1);
  }

  const query = queryArgs.join(' ');
  const filterSummary = [
    sourceFilter ? `source=${sourceFilter}` : null,
    formatFilter ? `format=${formatFilter}` : null,
  ]
    .filter(Boolean)
    .join(', ');
  console.log(`🔍 Searching for: "${query}"${filterSummary ? ` (${filterSummary})` : ''}\n`);

  const db = new KnowledgeDatabase('./db/knowledge.db');

  const results = db.searchText(query);
  const documentIds = Array.from(
    new Set(results.map((unit) => unit.documentId).filter((id): id is string => Boolean(id)))
  );

  const documentLookup = new Map<string, { format?: string; sourceId?: string }>();
  if (documentIds.length > 0) {
    const placeholders = documentIds.map(() => '?').join(',');
    const rows = db
      .getRawHandle()
      .prepare(`SELECT id, format, metadata FROM documents WHERE id IN (${placeholders})`)
      .all(...documentIds) as Array<{ id: string; format: string; metadata: string | null }>;

    for (const row of rows) {
      let sourceId: string | undefined;
      if (row.metadata) {
        try {
          const parsed = JSON.parse(row.metadata) as Record<string, unknown>;
          if (typeof parsed.sourceId === 'string' && parsed.sourceId.trim().length > 0) {
            sourceId = parsed.sourceId;
          }
        } catch {
          // Ignore malformed metadata in CLI view.
        }
      }
      documentLookup.set(row.id, { format: row.format, sourceId });
    }
  }

  const filteredResults = results.filter((unit) => {
    const docMeta = unit.documentId ? documentLookup.get(unit.documentId) : undefined;

    if (sourceFilter) {
      if (sourceFilter === 'claude') {
        if (!unit.conversationId && unit.documentId) return false;
      } else if (!docMeta || docMeta.sourceId !== sourceFilter) {
        return false;
      }
    }

    if (formatFilter) {
      if (!docMeta || docMeta.format !== formatFilter) {
        return false;
      }
    }

    return true;
  });

  if (filteredResults.length === 0) {
    console.log('No results found.');
  } else {
    console.log(`Found ${filteredResults.length} results:\n`);

    filteredResults.forEach((unit, i) => {
      const sourceType = unit.documentId ? 'DOCUMENT' : 'CHAT';
      const docMeta = unit.documentId ? documentLookup.get(unit.documentId) : undefined;
      console.log(`${i + 1}. [${unit.type.toUpperCase()}] ${unit.title}`);
      console.log(`   Type: ${sourceType}`);
      console.log(`   Source: ${docMeta?.sourceId || (sourceType === 'CHAT' ? 'claude' : '(unknown)')}`);
      console.log(`   Format: ${docMeta?.format || (sourceType === 'CHAT' ? 'chat' : '(unknown)')}`);
      console.log(`   Context: ${unit.context || '(none)'}`);
      console.log(`   Tags: ${unit.tags.join(', ')}`);
      console.log(`   Preview: ${unit.content.slice(0, 150).replace(/\n/g, ' ')}...`);
      console.log(`   ID: ${unit.id}`);
      console.log('');
    });
  }

  db.close();
}

main();
