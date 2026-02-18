/**
 * Phase 3: Claude Intelligence REST API
 * Exposes insight extraction, smart tagging, relationship detection, and summarization
 */

import { Router, Request, Response, NextFunction } from 'express';
import { KnowledgeDatabase } from './database.js';
import { logger, AppError } from './logger.js';
import { InsightExtractor } from './insight-extractor.js';
import { SmartTagger } from './smart-tagger.js';
import { RelationshipDetector } from './relationship-detector.js';
import { ConversationSummarizer } from './conversation-summarizer.js';
import { ClaudeService } from './claude-service.js';
import { AtomicUnit } from './types.js';

/**
 * Intelligence API response format
 */
interface IntelligenceResponse<T> {
  success: true;
  data: T;
  metadata?: {
    tokenUsage?: {
      inputTokens: number;
      outputTokens: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
      totalCost: number;
    };
    processingTime: number;
    cached?: boolean;
  };
  timestamp: string;
}

type SqlParam = string | number;

interface IntelligenceExtractBody {
  conversationId?: string;
  unitIds?: string[];
  save?: boolean;
}

interface RelationshipsDetectBody {
  unitIds?: string[];
  threshold?: number;
  save?: boolean;
}

interface ConversationLookupRow {
  id: string;
  title?: string | null;
  summary?: string | null;
}

interface AtomicUnitLookupRow {
  id: string;
  title?: string | null;
  content?: string | null;
}

interface CountRow {
  count: number;
}

function asString(value: unknown, fallback: string = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function firstQueryString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

/**
 * Create intelligence API router for Phase 3
 */
export function createIntelligenceRouter(db: KnowledgeDatabase): Router {
  const router = Router();
  const sql = db.getRawHandle();

  // Initialize Phase 3 services
  const claudeService = new ClaudeService();
  const insightExtractor = new InsightExtractor(claudeService);
  const smartTagger = new SmartTagger(claudeService);
  let relationshipDetector: RelationshipDetector | null = null;
  const conversationSummarizer = new ConversationSummarizer(claudeService);
  void conversationSummarizer;

  try {
    relationshipDetector = new RelationshipDetector('./atomized/embeddings/chroma', claudeService);
  } catch (e) {
    logger.warn('RelationshipDetector not available - vector embeddings required');
  }

  // Error handling middleware
  const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
  ) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  /**
   * GET /api/intelligence/insights
   * List extracted insights from atomic units
   */
  router.get(
    '/insights',
    asyncHandler(async (req: Request, res: Response) => {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
      const type = req.query.type as string | undefined;
      const category = req.query.category as string | undefined;
      const startTime = Date.now();

      // Query insights from atomic_units where type IN ('insight', 'decision')
      let query = `
        SELECT * FROM atomic_units
        WHERE type IN ('insight', 'decision')
      `;
      const params: SqlParam[] = [];

      if (type && ['insight', 'decision'].includes(type)) {
        query += ` AND type = ?`;
        params.push(type);
      }

      if (category) {
        query += ` AND category = ?`;
        params.push(category);
      }

      query += ` ORDER BY created DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, (page - 1) * pageSize);

      const insights = sql.prepare(query).all(...params) as Record<string, unknown>[];

      // Get total count
      let countQuery = `SELECT COUNT(*) as count FROM atomic_units WHERE type IN ('insight', 'decision')`;
      if (type) countQuery += ` AND type = ?`;
      if (category) countQuery += ` AND category = ?`;

      const countParams: SqlParam[] = [];
      if (type) countParams.push(type);
      if (category) countParams.push(category);

      const { count } = sql.prepare(countQuery).get(...countParams) as CountRow;
      const total = count || 0;

      const processingTime = Date.now() - startTime;

      res.json({
        success: true,
        data: insights,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        metadata: {
          processingTime,
        },
        timestamp: new Date().toISOString(),
      });
    })
  );

  /**
   * POST /api/intelligence/insights/extract
   * Extract insights from conversation or units on demand
   */
  router.post(
    '/insights/extract',
    asyncHandler(async (req: Request, res: Response) => {
      const { conversationId, unitIds, save } = (req.body ?? {}) as IntelligenceExtractBody;
      const startTime = Date.now();

      const validUnitIds = Array.isArray(unitIds)
        ? unitIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
        : [];

      if (!conversationId && validUnitIds.length === 0) {
        throw new AppError('Either conversationId or unitIds must be provided', 'MISSING_SOURCE', 400);
      }

      if (!process.env.ANTHROPIC_API_KEY) {
        throw new AppError('ANTHROPIC_API_KEY not configured', 'API_KEY_MISSING', 503);
      }

      try {
        let insights: AtomicUnit[] = [];

        if (conversationId) {
          // Load conversation from database
          const conversation = sql
            .prepare('SELECT * FROM conversations WHERE id = ?')
            .get(conversationId) as ConversationLookupRow | undefined;

          if (!conversation) {
            throw new AppError('Conversation not found', 'NOT_FOUND', 404);
          }

          // Extract insights (simplified - would load actual conversation messages)
          insights = await insightExtractor.extract(
            `${asString(conversation.title, 'Untitled')}\n${asString(conversation.summary)}`
          );
        } else if (validUnitIds.length > 0) {
          // Extract from provided units
          for (const unitId of validUnitIds) {
            const unit = sql
              .prepare('SELECT * FROM atomic_units WHERE id = ?')
              .get(unitId) as AtomicUnitLookupRow | undefined;
            if (unit) {
              const extracted = await insightExtractor.extract(asString(unit.content));
              insights.push(...extracted);
            }
          }
        }

        // Optionally save to database
        if (save) {
          for (const insight of insights) {
            sql
              .prepare(`
                INSERT INTO atomic_units (id, type, title, content, context, category, tags, keywords, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `)
              .run(
                insight.id,
                insight.type,
                insight.title,
                insight.content,
                'auto-extracted',
                insight.category || 'general',
                JSON.stringify(insight.tags || []),
                JSON.stringify(insight.keywords || []),
                new Date().toISOString()
              );
          }
        }

        const processingTime = Date.now() - startTime;
        const stats = claudeService.getTokenStats();

        res.json({
          success: true,
          data: insights,
          metadata: {
            tokenUsage: {
              inputTokens: stats.inputTokens,
              outputTokens: stats.outputTokens,
              totalCost: stats.totalCost,
            },
            processingTime,
          },
          timestamp: new Date().toISOString(),
        } as IntelligenceResponse<AtomicUnit[]>);
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(
          `Insight extraction failed: ${error instanceof Error ? error.message : String(error)}`,
          'EXTRACTION_ERROR',
          500
        );
      }
    })
  );

  /**
   * GET /api/intelligence/tags/suggestions
   * Get smart tag suggestions for a unit
   */
  router.get(
    '/tags/suggestions',
    asyncHandler(async (req: Request, res: Response) => {
      const unitId = req.query.unitId;
      const content = req.query.content;
      const title = req.query.title;
      const startTime = Date.now();

      if (!process.env.ANTHROPIC_API_KEY) {
        throw new AppError('ANTHROPIC_API_KEY not configured', 'API_KEY_MISSING', 503);
      }

      let unitContent = firstQueryString(content) ?? '';
      let unitTitle = firstQueryString(title) ?? '';

      // Load from database if unitId provided
      if (unitId) {
        const parsedUnitId = firstQueryString(unitId);
        if (!parsedUnitId) {
          throw new AppError('Invalid unitId value', 'INVALID_UNIT_ID', 400);
        }
        const unit = sql
          .prepare('SELECT * FROM atomic_units WHERE id = ?')
          .get(parsedUnitId) as AtomicUnitLookupRow | undefined;
        if (!unit) {
          throw new AppError('Unit not found', 'NOT_FOUND', 404);
        }
        unitContent = asString(unit.content);
        unitTitle = asString(unit.title);
      }

      if (!unitContent) {
        throw new AppError('Unit content or unitId is required', 'MISSING_CONTENT', 400);
      }

      try {
        const suggestions = await smartTagger.suggestTags({
          content: unitContent,
          title: unitTitle || 'Untitled',
          type: 'insight',
        });

        const processingTime = Date.now() - startTime;
        const stats = claudeService.getTokenStats();

        res.json({
          success: true,
          data: {
            tags: suggestions.tags,
            category: suggestions.category,
            keywords: suggestions.keywords,
            confidence: suggestions.confidence,
          },
          metadata: {
            tokenUsage: {
              inputTokens: stats.inputTokens,
              outputTokens: stats.outputTokens,
              totalCost: stats.totalCost,
            },
            processingTime,
          },
          timestamp: new Date().toISOString(),
        } as IntelligenceResponse<Record<string, unknown>>);
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(
          `Tag suggestion failed: ${error instanceof Error ? error.message : String(error)}`,
          'TAGGING_ERROR',
          500
        );
      }
    })
  );

  /**
   * GET /api/intelligence/relationships
   * List relationships for a unit
   */
  router.get(
    '/relationships',
    asyncHandler(async (req: Request, res: Response) => {
      const unitId = req.query.unitId;
      const type = req.query.type;
      const minStrength = req.query.minStrength;
      const startTime = Date.now();
      void minStrength;

      if (!unitId) {
        throw new AppError('unitId is required', 'MISSING_UNIT_ID', 400);
      }
      const parsedUnitId = firstQueryString(unitId);
      if (!parsedUnitId) {
        throw new AppError('Invalid unitId value', 'INVALID_UNIT_ID', 400);
      }

      // Check if unit exists
      const unit = sql.prepare('SELECT * FROM atomic_units WHERE id = ?').get(parsedUnitId) as
        | AtomicUnitLookupRow
        | undefined;
      if (!unit) {
        throw new AppError('Unit not found', 'NOT_FOUND', 404);
      }

      // Query relationships
      let query = `
        SELECT r.*, u.title, u.type, u.category
        FROM unit_relationships r
        JOIN atomic_units u ON r.to_unit = u.id
        WHERE r.from_unit = ?
      `;
      const params: SqlParam[] = [parsedUnitId];

      if (type) {
        const parsedType = firstQueryString(type);
        if (!parsedType) {
          throw new AppError('Invalid relationship type filter', 'INVALID_RELATIONSHIP_TYPE', 400);
        }
        query += ` AND r.relationship_type = ?`;
        params.push(parsedType);
      }

      const relationships = sql.prepare(query).all(...params) as Record<string, unknown>[];

      const processingTime = Date.now() - startTime;

      res.json({
        success: true,
        data: relationships,
        metadata: {
          processingTime,
        },
        timestamp: new Date().toISOString(),
      } as IntelligenceResponse<Array<Record<string, unknown>>>);
    })
  );

  /**
   * POST /api/intelligence/relationships/detect
   * Detect relationships between units
   */
  router.post(
    '/relationships/detect',
    asyncHandler(async (req: Request, res: Response) => {
      const { unitIds, threshold, save } = (req.body ?? {}) as RelationshipsDetectBody;
      const startTime = Date.now();
      void threshold;

      const validUnitIds = Array.isArray(unitIds)
        ? unitIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
        : [];

      if (validUnitIds.length === 0) {
        throw new AppError('unitIds array is required', 'MISSING_UNITS', 400);
      }

      if (!process.env.ANTHROPIC_API_KEY || !process.env.OPENAI_API_KEY) {
        throw new AppError('ANTHROPIC_API_KEY and OPENAI_API_KEY are required', 'API_KEY_MISSING', 503);
      }

      if (!relationshipDetector) {
        throw new AppError('Relationship detection not available - embeddings required', 'SERVICE_UNAVAILABLE', 503);
      }

      try {
        // Load units from database
        const units = db.getUnitsByIds(validUnitIds);

        if (units.length === 0) {
          throw new AppError('No valid units found', 'NOT_FOUND', 404);
        }

        // Detect relationships
        const relationships = await relationshipDetector.buildRelationshipGraph(units);

        // Optionally save to database
        if (save) {
          const insertStmt = sql.prepare(`
            INSERT OR REPLACE INTO unit_relationships (from_unit, to_unit, relationship_type)
            VALUES (?, ?, ?)
          `);

          for (const [unitId, rels] of relationships) {
            for (const rel of rels) {
              insertStmt.run(unitId, rel.toUnit, rel.relationshipType);
            }
          }
        }

        // Convert to array format for response
        const relationshipsArray = Array.from(relationships).map(([unitId, rels]) => ({
          fromUnit: unitId,
          relationships: rels,
        }));

        const processingTime = Date.now() - startTime;
        const stats = claudeService.getTokenStats();

        res.json({
          success: true,
          data: relationshipsArray,
          metadata: {
            tokenUsage: {
              inputTokens: stats.inputTokens,
              outputTokens: stats.outputTokens,
              totalCost: stats.totalCost,
            },
            processingTime,
          },
          timestamp: new Date().toISOString(),
        } as IntelligenceResponse<Array<{ fromUnit: string; relationships: unknown[] }>>);
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(
          `Relationship detection failed: ${error instanceof Error ? error.message : String(error)}`,
          'DETECTION_ERROR',
          500
        );
      }
    })
  );

  /**
   * GET /api/intelligence/summaries
   * List conversation summaries
   */
  router.get(
    '/summaries',
    asyncHandler(async (req: Request, res: Response) => {
      const startTime = Date.now();

      // Load summaries from database or file
      // For now, query from conversations table with summary field
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));

      const summaries = sql
        .prepare('SELECT id, title, summary FROM conversations ORDER BY created DESC LIMIT ? OFFSET ?')
        .all(pageSize, (page - 1) * pageSize) as Array<Record<string, unknown>>;

      const { count } = sql.prepare('SELECT COUNT(*) as count FROM conversations').get() as CountRow;
      const total = count || 0;

      const processingTime = Date.now() - startTime;

      res.json({
        success: true,
        data: summaries,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        metadata: {
          processingTime,
        },
        timestamp: new Date().toISOString(),
      });
    })
  );

  /**
   * GET /api/intelligence/health
   * Check intelligence services availability
   */
  router.get(
    '/health',
    asyncHandler(async (req: Request, res: Response) => {
      const checks = {
        claudeService: !!process.env.ANTHROPIC_API_KEY,
        relationshipDetector: !!relationshipDetector && !!process.env.OPENAI_API_KEY,
        database: true,
      };

      const allHealthy = Object.values(checks).every((v) => v);

      res.json({
        success: true,
        data: {
          status: allHealthy ? 'healthy' : 'degraded',
          services: checks,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    })
  );

  return router;
}
