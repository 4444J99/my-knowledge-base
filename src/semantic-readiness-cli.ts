#!/usr/bin/env node
/**
 * Semantic/Hybrid runtime readiness verification.
 * Fails fast when required dependencies are missing or misconfigured.
 */

import { config } from 'dotenv';
import { getConfig } from './config.js';
import { EmbeddingsService } from './embeddings-service.js';
import { HybridSearch } from './hybrid-search.js';
import { VectorDatabase } from './vector-database.js';

config();

interface ReadinessCheck {
  name: string;
  ok: boolean;
  detail: string;
  remediation?: string;
}

function emit(check: ReadinessCheck): void {
  const prefix = check.ok ? '✅' : '❌';
  console.log(`${prefix} ${check.name}: ${check.detail}`);
  if (!check.ok && check.remediation) {
    console.log(`   -> ${check.remediation}`);
  }
}

async function main() {
  const checks: ReadinessCheck[] = [];
  const cfg = getConfig().getAll();
  const embeddingConfig = cfg.embedding || cfg.embeddings || {};
  const embeddingProvider = process.env.KB_EMBEDDINGS_PROVIDER || embeddingConfig.provider || 'openai';
  const probeQuery = process.env.SEMANTIC_READINESS_QUERY || 'semantic readiness probe';

  const providerReady =
    embeddingProvider !== 'openai' || Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
  checks.push({
    name: 'Embedding provider credentials',
    ok: providerReady,
    detail: `provider=${embeddingProvider}`,
    remediation: providerReady
      ? undefined
      : 'Set OPENAI_API_KEY or configure KB_EMBEDDINGS_PROVIDER=mock/local for non-production probes.',
  });

  const vectorDb = new VectorDatabase('./atomized/embeddings/chroma');
  const endpoint = vectorDb.getEndpoint();

  let vectorsAvailable = false;
  try {
    await vectorDb.init();
    const stats = await vectorDb.getStats();
    vectorsAvailable = stats.totalVectors > 0;
    checks.push({
      name: 'Vector database connectivity',
      ok: true,
      detail: `endpoint=${endpoint}`,
    });
    checks.push({
      name: 'Vector index availability',
      ok: vectorsAvailable,
      detail: `totalVectors=${stats.totalVectors}`,
      remediation: vectorsAvailable
        ? undefined
        : 'Generate embeddings and index vectors: npm run generate-embeddings -- --yes',
    });
  } catch (error) {
    checks.push({
      name: 'Vector database connectivity',
      ok: false,
      detail: `endpoint=${endpoint}, error=${error instanceof Error ? error.message : String(error)}`,
      remediation: 'Ensure Chroma is reachable (CHROMA_URL or CHROMA_HOST/CHROMA_PORT) and running.',
    });
  }

  let embedding: number[] | null = null;
  if (providerReady) {
    try {
      const embeddings = new EmbeddingsService();
      embedding = await embeddings.generateEmbedding(probeQuery);
      checks.push({
        name: 'Embedding generation',
        ok: true,
        detail: `dimensions=${embedding.length}`,
      });
    } catch (error) {
      checks.push({
        name: 'Embedding generation',
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
        remediation: 'Verify provider credentials/network and embedding model configuration.',
      });
    }
  }

  if (embedding && vectorsAvailable) {
    try {
      const semanticResults = await vectorDb.searchByEmbedding(embedding, 3);
      checks.push({
        name: 'Semantic vector query',
        ok: true,
        detail: `results=${semanticResults.length}`,
      });
    } catch (error) {
      checks.push({
        name: 'Semantic vector query',
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
        remediation: 'Confirm vector collection schema and indexed embeddings are consistent.',
      });
    }
  }

  if (providerReady) {
    try {
      const hybrid = new HybridSearch('./db/knowledge.db', './atomized/embeddings/chroma');
      const results = await hybrid.search(probeQuery, 3, { fts: 0.4, semantic: 0.6 });
      checks.push({
        name: 'Hybrid search execution',
        ok: true,
        detail: `results=${results.length}, endpoint=${hybrid.getVectorEndpoint()}`,
      });
      hybrid.close();
    } catch (error) {
      checks.push({
        name: 'Hybrid search execution',
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
        remediation: 'Resolve vector DB connectivity and embedding provider readiness before enabling production semantic/hybrid.',
      });
    }
  }

  console.log('\nSemantic/Hybrid Readiness Report');
  console.log('--------------------------------');
  checks.forEach(emit);

  const failed = checks.filter(check => !check.ok);
  if (failed.length > 0) {
    console.log(`\nReadiness failed: ${failed.length} check(s) failed.`);
    process.exit(1);
  }

  console.log('\nReadiness passed: semantic/hybrid dependencies are production-ready.');
}

main().catch((error) => {
  console.error('Readiness script failed unexpectedly:', error);
  process.exit(1);
});

