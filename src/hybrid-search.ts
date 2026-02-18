/**
 * Hybrid search - combines full-text search (FTS) and semantic search (vector)
 * Uses Reciprocal Rank Fusion (RRF) to merge results
 */

import { createHash } from 'crypto';
import { resolve } from 'path';
import { KnowledgeDatabase } from './database.js';
import { EmbeddingsService } from './embeddings-service.js';
import { VectorDatabase } from './vector-database.js';
import { AtomicUnit } from './types.js';

export interface HybridSearchResult {
  unit: AtomicUnit;
  ftsScore: number;
  semanticScore: number;
  combinedScore: number;
}

export interface HybridSearchOptions {
  enforceVectorSqlParity?: boolean;
}

export class HybridSearch {
  private db: KnowledgeDatabase;
  private embeddingsService: EmbeddingsService;
  private vectorDb: VectorDatabase;
  private ownsDbConnection: boolean;
  private initPromise: Promise<void> | null = null;
  private readonly enforceVectorSqlParity: boolean;
  private readonly vectorScopeId: string;

  constructor(
    dbPathOrInstance: string | KnowledgeDatabase = './db/knowledge.db',
    vectorDbPath: string = './atomized/embeddings/chroma',
    options: HybridSearchOptions = {}
  ) {
    const dbPathForScope = this.resolveDbPath(dbPathOrInstance);
    this.vectorScopeId = this.buildVectorScopeId(dbPathForScope);
    if (typeof dbPathOrInstance === 'string') {
      this.db = new KnowledgeDatabase(dbPathOrInstance);
      this.ownsDbConnection = true;
    } else {
      this.db = dbPathOrInstance;
      this.ownsDbConnection = false;
    }
    this.embeddingsService = new EmbeddingsService();
    this.enforceVectorSqlParity = options.enforceVectorSqlParity ?? true;
    this.vectorDb = new VectorDatabase(vectorDbPath, {
      embeddingProfile: this.embeddingsService.getProfile(),
      collectionPrefix: `knowledge_units_${this.vectorScopeId}`,
      activeProfilePointerPath: `./atomized/embeddings/active-profile-${this.vectorScopeId}.json`,
      scopeId: this.vectorScopeId,
    });
  }

  async init() {
    if (!this.initPromise) {
      this.initPromise = this.vectorDb.init().catch(error => {
        this.initPromise = null;
        throw error;
      });
    }

    await this.initPromise;
  }

  /**
   * Hybrid search using both FTS and semantic search
   */
  async search(
    query: string,
    limit: number = 10,
    weights: { fts: number; semantic: number } = { fts: 0.6, semantic: 0.4 },
    options: {
      dateFrom?: string;
      dateTo?: string;
      source?: string;
      format?: string;
    } = {}
  ): Promise<HybridSearchResult[]> {
    await this.init();

    // API layer already bounds search windows; avoid additional amplification.
    const fetchLimit = limit;

    // Parallel execution of both searches
    const [ftsResults, queryEmbedding] = await Promise.all([
      // Full-text search
      Promise.resolve(this.db.searchText(query, fetchLimit)),
      // Generate query embedding for semantic search
      this.embeddingsService.generateEmbedding(query),
    ]);

    // Semantic search
    const semanticResults = await this.vectorDb.searchByEmbedding(queryEmbedding, fetchLimit);
    const semanticUnits = this.enforceActiveStoreParity(semanticResults.map((result) => result.unit));

    // Combine results using Reciprocal Rank Fusion (RRF)
    const rrf = await this.reciprocalRankFusion(
      ftsResults,
      semanticUnits,
      query,
      weights,
      60,
      options
    );

    return rrf.slice(0, limit).map(r => ({
      unit: r.unit,
      ftsScore: ftsResults.find(u => u.id === r.unit.id) ? 1 : 0,
      semanticScore: semanticResults.find(s => s.unit.id === r.unit.id)?.score || 0,
      combinedScore: r.score
    }));
  }

  /**
   * Reciprocal Rank Fusion (RRF)
   * Combines multiple ranked lists into a single ranking
   */
  private async reciprocalRankFusion(
    ftsResults: AtomicUnit[],
    semanticResults: AtomicUnit[],
    query: string,
    weights: { fts: number; semantic: number },
    k: number = 60,
    filters: {
      dateFrom?: string;
      dateTo?: string;
      source?: string;
      format?: string;
    } = {}
  ): Promise<{ unit: AtomicUnit; score: number }[]> {
    const scores = new Map<string, { unit: AtomicUnit; score: number }>();

    const shouldBoostImages = this.querySuggestsVisualIntent(query);

    // Add FTS results
    ftsResults.forEach((unit, rank) => {
      const score = weights.fts / (k + rank + 1);
      scores.set(unit.id, { unit, score });
    });

    // Add semantic results
    semanticResults.forEach((unit, rank) => {
      const score = weights.semantic / (k + rank + 1);

      if (scores.has(unit.id)) {
        // Combine scores if unit appears in both results
        scores.get(unit.id)!.score += score;
      } else {
        scores.set(unit.id, { unit, score });
      }
    });

    let results = Array.from(scores.values());

    // Enrich with Document metadata if filtering by source/format
    if (filters.source || filters.format) {
      // Fetch documents for units that have documentId
      const docIds = [...new Set(results.map(r => r.unit.documentId).filter(Boolean) as string[])];
      if (docIds.length > 0) {
        // We need a method to get docs by IDs. KnowledgeDatabase doesn't have it exposed nicely.
        // Let's rely on unit details or we need to add a method.
        // Since we are in the same process, we can access the DB if we make a method.
        // Or we can use `db` property since this is a class method.
        
        // Let's assume we can fetch docs. 
        // For performance, let's fetch only if needed.
        // But we need to filter BEFORE sorting? No, we can filter after RRF but before boost.
        
        // Actually, filtering implies we remove items.
        
        const docs = this.db['db'].prepare(`
          SELECT id, format, metadata FROM documents WHERE id IN (${docIds.map(() => '?').join(',')})
        `).all(...docIds) as Array<{ id: string; format: string; metadata: string }>;
        
        const docMap = new Map(docs.map(d => [d.id, d]));
        
        results = results.filter(r => {
          if (!r.unit.documentId) return !filters.source && !filters.format;
          
          const doc = docMap.get(r.unit.documentId);
          if (!doc) return false;
          
          if (filters.format && doc.format !== filters.format) return false;
          
          if (filters.source) {
             try {
                const meta = JSON.parse(doc.metadata);
                if (meta.sourceId !== filters.source) return false;
             } catch {
                return false;
             }
          }
          return true;
        });
      } else if (filters.source || filters.format) {
         // If we have filters but no docIds, we filter out everything?
         // Unless source='claude' (no docId).
         if (filters.source === 'claude') {
             results = results.filter(r => r.unit.conversationId);
         } else {
             results = [];
         }
      }
    }

    // Apply boosts
    results = results.map(item => {
      let boost = 0;
      
      // Boost for high-quality chunks
      if (item.unit.tags.some(t => t.startsWith('chunk-strategy-'))) {
        boost += 0.05;
      }
      
      // Apply image boost only when the query implies visual intent.
      if (shouldBoostImages && item.unit.tags.includes('has-image')) {
        boost += 0.02;
      }
      
      return { ...item, score: item.score + boost };
    });
    
    // Apply Date filters
    if (filters.dateFrom || filters.dateTo) {
        const from = filters.dateFrom ? new Date(filters.dateFrom).getTime() : 0;
        const to = filters.dateTo ? new Date(filters.dateTo).getTime() : Infinity;
        
        results = results.filter(r => {
            const t = r.unit.timestamp.getTime();
            return t >= from && t <= to;
        });
    }

    // Sort by combined score
    return results.sort((a, b) => b.score - a.score);
  }

  private querySuggestsVisualIntent(query: string): boolean {
    const q = query.toLowerCase();
    const terms = [
      'image',
      'images',
      'photo',
      'photos',
      'picture',
      'pictures',
      'diagram',
      'diagrams',
      'screenshot',
      'screenshots',
      'visual',
      'ui',
      'ux',
      'mockup',
      'wireframe',
      'chart',
      'graph',
      'figure',
    ];
    return terms.some((term) => q.includes(term));
  }

  /**
   * Tag-based search (from existing database)
   */
  searchByTag(tagName: string): AtomicUnit[] {
    return this.db.getUnitsByTag(tagName);
  }

  /**
   * Get statistics
   */
  getStats() {
    return this.db.getStats();
  }

  getVectorEndpoint(): string {
    return this.vectorDb.getEndpoint();
  }

  getVectorProfileId(): string {
    return this.vectorDb.getActiveProfileId();
  }

  getVectorScopeId(): string {
    return this.vectorScopeId;
  }

  getEmbeddingProfileId(): string {
    return this.embeddingsService.getProfile().profileId;
  }

  close() {
    if (this.ownsDbConnection) {
      this.db.close();
    }
  }

  private enforceActiveStoreParity(units: AtomicUnit[]): AtomicUnit[] {
    if (!this.enforceVectorSqlParity || units.length === 0) {
      return units;
    }

    const uniqueIds = Array.from(new Set(units.map((unit) => unit.id)));
    const resolvedUnits = this.db.getUnitsByIds(uniqueIds, { limit: uniqueIds.length });
    const byId = new Map(resolvedUnits.map((unit) => [unit.id, unit]));

    return units
      .map((unit) => byId.get(unit.id))
      .filter((unit): unit is AtomicUnit => Boolean(unit));
  }

  private resolveDbPath(input: string | KnowledgeDatabase): string {
    if (typeof input === 'string') {
      return resolve(input);
    }
    return input.getPath();
  }

  private buildVectorScopeId(dbPath: string): string {
    return createHash('sha256').update(resolve(dbPath)).digest('hex').slice(0, 12);
  }
}
