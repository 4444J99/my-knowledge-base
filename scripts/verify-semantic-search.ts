#!/usr/bin/env node
/**
 * Semantic Search Verification Script
 * Verifies that embeddings are working for Documents (not just Chats).
 */

import { KnowledgeDatabase } from '../src/database.js';
import { VectorDatabase } from '../src/vector-database.js';
import { EmbeddingsService } from '../src/embeddings-service.js';
import { config } from 'dotenv';

config();

async function main() {
  console.log('🧪 Verifying Semantic Search...\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY required for verification');
    process.exit(1);
  }

  const db = new KnowledgeDatabase('./db/knowledge.db');
  const vectorDb = new VectorDatabase('./atomized/embeddings/chroma');
  const embeddings = new EmbeddingsService();

  await vectorDb.init();

  // 1. Check if we have documents
  const stats = db.getStats();
  console.log(`📊 Database Stats:`);
  console.log(`   - Documents: ${stats.totalDocuments.count}`);
  console.log(`   - Conversations: ${stats.totalConversations.count}`);
  console.log(`   - Atomic Units: ${stats.totalUnits.count}`);

  if (stats.totalDocuments.count === 0) {
    console.warn('⚠️  No documents found. Please ingest some files first.');
  }

  // 2. Perform a test query that targets known document content
  // "taxes" is a good candidate based on user context
  const query = "taxes";
  console.log(`\n🔍 Searching for: "${query}"`);

  const queryEmbedding = await embeddings.generateEmbedding(query);
  const results = await vectorDb.searchByEmbedding(queryEmbedding, 5);

  console.log(`\n✅ Found ${results.length} results:`);
  
  results.forEach((res, i) => {
    // Fetch full unit to check type
    const unit = db.getUnitById(res.id);
    const type = unit?.documentId ? 'DOCUMENT' : 'CHAT';
    const source = unit?.conversationId ? 'Claude' : 'File/Other';
    
    console.log(`${i + 1}. [${type}] ${res.metadata.title} (${(res.score * 100).toFixed(1)}%)`);
    console.log(`   Source: ${source}`);
    console.log(`   Preview: ${res.metadata.content.slice(0, 100).replace(/\n/g, ' ')}...`);
  });

  db.close();
}

main().catch(console.error);
