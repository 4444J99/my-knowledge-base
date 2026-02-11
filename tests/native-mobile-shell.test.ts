import { describe, expect, it, vi } from 'vitest';
import { MobileUniverseClient } from '../apps/mobile/src/universe-client';
import {
  createAsyncKeyValueExplorationStorage,
  RecentExplorationCache,
} from '../apps/mobile/src/offline-cache';
import { MobileUniverseShell } from '../apps/mobile/src/shell';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Mobile universe shell', () => {
  it('initializes and supports provider/chat/term drill-down with saved exploration restore', async () => {
    const timestamp = '2026-02-11T00:00:00.000Z';
    const providers = [
      {
        id: 'provider-chatgpt',
        providerId: 'chatgpt',
        displayName: 'ChatGPT',
        metadata: {},
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: 'provider-gemini',
        providerId: 'gemini',
        displayName: 'Gemini',
        metadata: {},
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ];
    const chatsByProvider: Record<string, Array<Record<string, unknown>>> = {
      chatgpt: [
        {
          id: 'chat-a',
          providerRefId: 'provider-chatgpt',
          title: 'Chat A',
          sourcePath: '/intake/chat-a.json',
          metadata: {},
          providerId: 'chatgpt',
          providerName: 'ChatGPT',
          turnCount: 2,
        },
      ],
      gemini: [
        {
          id: 'chat-g',
          providerRefId: 'provider-gemini',
          title: 'Chat G',
          sourcePath: '/intake/chat-g.json',
          metadata: {},
          providerId: 'gemini',
          providerName: 'Gemini',
          turnCount: 1,
        },
      ],
    };
    const turnsByChat: Record<string, Array<Record<string, unknown>>> = {
      'chat-a': [
        {
          id: 'turn-a-1',
          threadId: 'chat-a',
          turnIndex: 0,
          role: 'user',
          content: 'alpha',
          metadata: {},
        },
      ],
      'chat-g': [
        {
          id: 'turn-g-1',
          threadId: 'chat-g',
          turnIndex: 0,
          role: 'assistant',
          content: 'gamma',
          metadata: {},
        },
      ],
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/universe/summary')) {
        return jsonResponse({
          success: true,
          data: {
            providers: 2,
            accounts: 1,
            chats: 2,
            turns: 3,
            terms: 10,
            occurrences: 20,
            updatedAt: timestamp,
          },
          timestamp,
        });
      }
      if (url.includes('/universe/providers?')) {
        return jsonResponse({
          success: true,
          data: providers,
          pagination: { limit: 100, offset: 0, total: providers.length, totalPages: 1 },
          timestamp,
        });
      }
      if (url.includes('/universe/providers/chatgpt/chats')) {
        const data = chatsByProvider.chatgpt;
        return jsonResponse({
          success: true,
          data,
          pagination: { limit: 200, offset: 0, total: data.length, totalPages: 1 },
          timestamp,
        });
      }
      if (url.includes('/universe/providers/gemini/chats')) {
        const data = chatsByProvider.gemini;
        return jsonResponse({
          success: true,
          data,
          pagination: { limit: 200, offset: 0, total: data.length, totalPages: 1 },
          timestamp,
        });
      }
      if (url.includes('/universe/chats/chat-a/turns')) {
        const data = turnsByChat['chat-a'];
        return jsonResponse({
          success: true,
          data,
          pagination: { limit: 500, offset: 0, total: data.length, totalPages: 1 },
          timestamp,
        });
      }
      if (url.includes('/universe/chats/chat-g/turns')) {
        const data = turnsByChat['chat-g'];
        return jsonResponse({
          success: true,
          data,
          pagination: { limit: 500, offset: 0, total: data.length, totalPages: 1 },
          timestamp,
        });
      }
      if (url.includes('/universe/terms/nebula/occurrences')) {
        return jsonResponse({
          success: true,
          data: [
            {
              id: 'occ-1',
              term: 'nebula',
              normalizedTerm: 'nebula',
              providerId: 'chatgpt',
              threadId: 'chat-a',
              turnId: 'turn-a-1',
              chatTitle: 'Chat A',
              turnIndex: 0,
              role: 'user',
              content: 'alpha nebula',
              position: 6,
            },
          ],
          pagination: { limit: 500, offset: 0, total: 1, totalPages: 1 },
          timestamp,
        });
      }
      return jsonResponse({ success: true, data: [], timestamp });
    });

    const kv = new Map<string, string>();
    const cache = new RecentExplorationCache({
      maxEntries: 10,
      storage: createAsyncKeyValueExplorationStorage({
        getItem: async (key) => kv.get(key) ?? null,
        setItem: async (key, value) => {
          kv.set(key, value);
        },
      }),
    });
    const client = new MobileUniverseClient({
      baseUrl: 'http://localhost:3000/api',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const shell = new MobileUniverseShell(client, cache);

    const initialized = await shell.initialize();
    expect(initialized.status).toBe('ready');
    expect(initialized.selectedProviderId).toBe('chatgpt');
    expect(initialized.selectedChatId).toBe('chat-a');
    expect(initialized.turns.length).toBe(1);

    const gemini = await shell.selectProvider('gemini');
    expect(gemini.selectedProviderId).toBe('gemini');
    expect(gemini.selectedChatId).toBe('chat-g');
    expect(gemini.turns[0]?.id).toBe('turn-g-1');

    const termState = await shell.searchTerm('Nebula');
    expect(termState.activeTerm).toBe('nebula');
    expect(termState.occurrences.length).toBe(1);

    const saved = await shell.saveSelection('nebula trace');
    expect(saved.savedExplorations.length).toBe(1);
    const savedItem = saved.savedExplorations[0];
    expect(savedItem.label).toBe('nebula trace');

    const restored = await shell.restore({
      providerId: savedItem.providerId,
      chatId: savedItem.chatId,
      term: savedItem.term,
    });
    expect(restored.selectedProviderId).toBe('gemini');
    expect(restored.selectedChatId).toBe('chat-g');
    expect(restored.activeTerm).toBe('nebula');
  });
});
