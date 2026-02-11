import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../logger.js';
import { parseIntParam } from '../api-utils.js';
import { UniverseStore } from './store.js';

function parseMinWeight(value: string | undefined): number {
  if (value === undefined) return 1;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AppError('Invalid minWeight', 'INVALID_PARAMETER', 400);
  }
  return parsed;
}

export function createUniverseRouter(store: UniverseStore): Router {
  const router = Router();

  const asyncHandler =
    (fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

  router.get(
    '/summary',
    asyncHandler(async (_req, res) => {
      res.json({
        success: true,
        data: store.getUniverseSummary(),
        timestamp: new Date().toISOString(),
      });
    }),
  );

  router.get(
    '/providers',
    asyncHandler(async (req, res) => {
      const limit = parseIntParam(req.query.limit as string | undefined, 'limit', 25, 1, 200);
      const offset = parseIntParam(req.query.offset as string | undefined, 'offset', 0, 0, 100_000);

      const result = store.listProviders(limit, offset);
      res.json({
        success: true,
        data: result.items,
        pagination: {
          limit,
          offset,
          total: result.total,
          totalPages: result.total === 0 ? 0 : Math.ceil(result.total / limit),
        },
        timestamp: new Date().toISOString(),
      });
    }),
  );

  router.get(
    '/providers/:providerId/chats',
    asyncHandler(async (req, res) => {
      const { providerId } = req.params;
      const limit = parseIntParam(req.query.limit as string | undefined, 'limit', 50, 1, 500);
      const offset = parseIntParam(req.query.offset as string | undefined, 'offset', 0, 0, 100_000);

      const result = store.listProviderChats(providerId, limit, offset);
      res.json({
        success: true,
        data: result.items,
        pagination: {
          limit,
          offset,
          total: result.total,
          totalPages: result.total === 0 ? 0 : Math.ceil(result.total / limit),
        },
        timestamp: new Date().toISOString(),
      });
    }),
  );

  router.get(
    '/chats/:chatId',
    asyncHandler(async (req, res) => {
      const chat = store.getChat(req.params.chatId);
      if (!chat) {
        throw new AppError('Chat not found', 'NOT_FOUND', 404);
      }

      res.json({
        success: true,
        data: chat,
        timestamp: new Date().toISOString(),
      });
    }),
  );

  router.get(
    '/chats/:chatId/turns',
    asyncHandler(async (req, res) => {
      const { chatId } = req.params;
      const limit = parseIntParam(req.query.limit as string | undefined, 'limit', 200, 1, 1000);
      const offset = parseIntParam(req.query.offset as string | undefined, 'offset', 0, 0, 100_000);

      const chat = store.getChat(chatId);
      if (!chat) {
        throw new AppError('Chat not found', 'NOT_FOUND', 404);
      }

      const result = store.listChatTurns(chatId, limit, offset);
      res.json({
        success: true,
        data: result.items,
        pagination: {
          limit,
          offset,
          total: result.total,
          totalPages: result.total === 0 ? 0 : Math.ceil(result.total / limit),
        },
        timestamp: new Date().toISOString(),
      });
    }),
  );

  router.get(
    '/chats/:chatId/network',
    asyncHandler(async (req, res) => {
      const { chatId } = req.params;
      const limit = parseIntParam(req.query.limit as string | undefined, 'limit', 100, 1, 500);

      const chat = store.getChat(chatId);
      if (!chat) {
        throw new AppError('Chat not found', 'NOT_FOUND', 404);
      }

      res.json({
        success: true,
        data: store.getChatNetwork(chatId, limit),
        timestamp: new Date().toISOString(),
      });
    }),
  );

  router.get(
    '/terms/:term/occurrences',
    asyncHandler(async (req, res) => {
      const { term } = req.params;
      const limit = parseIntParam(req.query.limit as string | undefined, 'limit', 100, 1, 2000);
      const offset = parseIntParam(req.query.offset as string | undefined, 'offset', 0, 0, 100_000);

      const result = store.findTermOccurrences(term, limit, offset);
      res.json({
        success: true,
        data: result.items,
        pagination: {
          limit,
          offset,
          total: result.total,
          totalPages: result.total === 0 ? 0 : Math.ceil(result.total / limit),
        },
        timestamp: new Date().toISOString(),
      });
    }),
  );

  router.get(
    '/networks/parallel',
    asyncHandler(async (req, res) => {
      const limit = parseIntParam(req.query.limit as string | undefined, 'limit', 250, 1, 5000);
      const minWeight = parseMinWeight(req.query.minWeight as string | undefined);

      res.json({
        success: true,
        data: store.listParallelNetworks(limit, minWeight),
        timestamp: new Date().toISOString(),
      });
    }),
  );

  router.post(
    '/reindex',
    asyncHandler(async (_req, res) => {
      const runId = store.createIngestRun('universe-reindex', { trigger: 'api' });
      res.status(202).json({
        success: true,
        data: {
          runId,
          status: 'running',
        },
        timestamp: new Date().toISOString(),
      });

      void Promise.resolve().then(() => {
        try {
          const result = store.reindexUniverse();
          store.completeIngestRun(
            runId,
            'completed',
            {
              filesScanned: 0,
              filesIngested: 0,
              filesQuarantined: 0,
              chatsIngested: result.threadsIndexed,
              turnsIngested: result.turnsIndexed,
            },
            {
              metadata: result,
            },
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          store.completeIngestRun(
            runId,
            'failed',
            {
              filesScanned: 0,
              filesIngested: 0,
              filesQuarantined: 0,
              chatsIngested: 0,
              turnsIngested: 0,
            },
            {
              metadata: { error: message },
            },
          );
        }
      });
    }),
  );

  router.get(
    '/reindex/:runId',
    asyncHandler(async (req, res) => {
      const run = store.getIngestRun(req.params.runId);
      if (!run) {
        throw new AppError('Run not found', 'NOT_FOUND', 404);
      }

      res.json({
        success: true,
        data: run,
        timestamp: new Date().toISOString(),
      });
    }),
  );

  return router;
}
