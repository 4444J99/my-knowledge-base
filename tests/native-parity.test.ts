import { describe, expect, it, vi } from 'vitest';
import { MobileUniverseClient } from '../apps/mobile/src/universe-client';
import { createAsyncKeyValueExplorationStorage, RecentExplorationCache } from '../apps/mobile/src/offline-cache';
import { ResumableSyncState, buildSyncPlan } from '../apps/mobile/src/sync';
import { DesktopUniverseClient } from '../apps/desktop/src/universe-client';
import { advanceReindexWorkflow, createAttachPoint, startReindexWorkflow } from '../apps/desktop/src/workflows';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Native parity core modules', () => {
  it('mobile universe client hits provider/chat/term endpoints with auth header', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });

      if (url.endsWith('/universe/summary')) {
        return jsonResponse({ success: true, data: { providers: 1, chats: 1, turns: 2, terms: 3, accounts: 0, occurrences: 3, updatedAt: new Date().toISOString() }, timestamp: new Date().toISOString() });
      }
      if (url.includes('/providers/chatgpt/chats')) {
        return jsonResponse({ success: true, data: [], pagination: { limit: 50, offset: 0, total: 0, totalPages: 0 }, timestamp: new Date().toISOString() });
      }
      if (url.includes('/terms/nebula/occurrences')) {
        return jsonResponse({ success: true, data: [], pagination: { limit: 10, offset: 0, total: 0, totalPages: 0 }, timestamp: new Date().toISOString() });
      }
      return jsonResponse({ success: true, data: [], pagination: { limit: 50, offset: 0, total: 0, totalPages: 0 }, timestamp: new Date().toISOString() });
    });

    const client = new MobileUniverseClient({
      baseUrl: 'http://localhost:3000/api/',
      authHeader: 'Bearer native-token',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await client.summary();
    await client.providerChats('chatgpt', { limit: 50, offset: 0 });
    await client.termOccurrences('nebula', { limit: 10, offset: 0 });

    expect(calls.some((call) => call.url === 'http://localhost:3000/api/universe/summary')).toBe(true);
    expect(calls.some((call) => call.url.includes('/universe/providers/chatgpt/chats?limit=50&offset=0'))).toBe(true);
    expect(calls.some((call) => call.url.includes('/universe/terms/nebula/occurrences?limit=10&offset=0'))).toBe(true);
    expect(calls[0].init?.headers).toMatchObject({ Authorization: 'Bearer native-token' });
  });

  it('recent exploration cache dedupes and enforces max entries', async () => {
    const cache = new RecentExplorationCache({ maxEntries: 2 });
    await cache.add({ label: 'chatgpt-nebula', providerId: 'chatgpt', chatId: 'c1', term: 'nebula' });
    await cache.add({ label: 'claude-nebula', providerId: 'claude', chatId: 'c2', term: 'nebula' });
    await cache.add({ label: 'chatgpt-nebula-duplicate', providerId: 'chatgpt', chatId: 'c1', term: 'nebula' });

    const entries = cache.list();
    expect(entries).toHaveLength(2);
    expect(entries[0].providerId).toBe('chatgpt');
    expect(entries[1].providerId).toBe('claude');
  });

  it('recent exploration cache persists and hydrates via key-value adapter', async () => {
    const state = new Map<string, string>();
    const adapter = createAsyncKeyValueExplorationStorage({
      getItem: async (key) => state.get(key) ?? null,
      setItem: async (key, value) => {
        state.set(key, value);
      },
    });

    const writer = new RecentExplorationCache({ maxEntries: 5, storage: adapter });
    await writer.add({ label: 'saved-nebula', providerId: 'chatgpt', chatId: 'chat-1', term: 'nebula' });

    const reader = new RecentExplorationCache({ maxEntries: 5, storage: adapter });
    const hydrated = await reader.hydrate();
    expect(hydrated).toHaveLength(1);
    expect(hydrated[0].label).toBe('saved-nebula');
  });

  it('resumable sync state tracks per-provider offsets', () => {
    const state = new ResumableSyncState();
    state.markCompleted('chatgpt', 100);
    state.markCompleted('claude', 50);

    const plan = buildSyncPlan(['chatgpt', 'claude', 'gemini'], state, 25);
    expect(plan).toEqual([
      { providerId: 'chatgpt', limit: 25, offset: 100 },
      { providerId: 'claude', limit: 25, offset: 50 },
      { providerId: 'gemini', limit: 25, offset: 0 },
    ]);
  });

  it('desktop workflows create attach points and evolve reindex state', () => {
    const attach = createAttachPoint({
      label: 'Primary Intake',
      absolutePath: '/data/intake',
    });
    expect(attach.id).toBe('primary-intake-data-intake');
    expect(attach.includePatterns.length).toBeGreaterThan(0);

    const started = startReindexWorkflow('run-123');
    expect(started.status).toBe('running');
    expect(started.runId).toBe('run-123');

    const completed = advanceReindexWorkflow(started, 'completed');
    expect(completed.status).toBe('completed');
    expect(Date.parse(completed.updatedAt)).toBeGreaterThanOrEqual(Date.parse(started.updatedAt));
  });

  it('desktop universe client starts and polls reindex', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/universe/reindex') && init?.method === 'POST') {
        return jsonResponse({
          success: true,
          data: { runId: 'run-abc', status: 'running' },
          timestamp: new Date().toISOString(),
        });
      }
      if (url.endsWith('/universe/reindex/run-abc')) {
        return jsonResponse({
          success: true,
          data: { status: 'completed', turnsIngested: 42 },
          timestamp: new Date().toISOString(),
        });
      }
      return jsonResponse({ success: true, data: {}, timestamp: new Date().toISOString() });
    });

    const client = new DesktopUniverseClient({
      baseUrl: 'http://localhost:3000/api',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const run = await client.startReindex();
    const status = await client.reindexStatus(run.runId);

    expect(run).toEqual({ runId: 'run-abc', status: 'running' });
    expect(status).toEqual({ status: 'completed', turnsIngested: 42 });
  });
});
