import { describe, expect, it, vi } from 'vitest';
import { DesktopUniverseClient } from '../apps/desktop/src/universe-client';
import { DesktopUniverseShell } from '../apps/desktop/src/shell';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Desktop universe shell', () => {
  it('initializes and drills down provider -> chat -> turns', async () => {
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
        id: 'provider-claude',
        providerId: 'claude',
        displayName: 'Claude',
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
      claude: [
        {
          id: 'chat-c',
          providerRefId: 'provider-claude',
          title: 'Chat C',
          sourcePath: '/intake/chat-c.json',
          metadata: {},
          providerId: 'claude',
          providerName: 'Claude',
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
      'chat-c': [
        {
          id: 'turn-c-1',
          threadId: 'chat-c',
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
          pagination: { limit: 500, offset: 0, total: data.length, totalPages: 1 },
          timestamp,
        });
      }
      if (url.includes('/universe/providers/claude/chats')) {
        const data = chatsByProvider.claude;
        return jsonResponse({
          success: true,
          data,
          pagination: { limit: 500, offset: 0, total: data.length, totalPages: 1 },
          timestamp,
        });
      }
      if (url.includes('/universe/chats/chat-a/turns')) {
        const data = turnsByChat['chat-a'];
        return jsonResponse({
          success: true,
          data,
          pagination: { limit: 1000, offset: 0, total: data.length, totalPages: 1 },
          timestamp,
        });
      }
      if (url.includes('/universe/chats/chat-c/turns')) {
        const data = turnsByChat['chat-c'];
        return jsonResponse({
          success: true,
          data,
          pagination: { limit: 1000, offset: 0, total: data.length, totalPages: 1 },
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

    const client = new DesktopUniverseClient({
      baseUrl: 'http://localhost:3000/api',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const shell = new DesktopUniverseShell(client);

    const initialized = await shell.initialize();
    expect(initialized.status).toBe('ready');
    expect(initialized.selectedProviderId).toBe('chatgpt');
    expect(initialized.selectedChatId).toBe('chat-a');
    expect(initialized.turns.length).toBe(1);

    const claudeState = await shell.selectProvider('claude');
    expect(claudeState.selectedProviderId).toBe('claude');
    expect(claudeState.selectedChatId).toBe('chat-c');
    expect(claudeState.turns[0]?.id).toBe('turn-c-1');

    const termState = await shell.searchTerm('Nebula');
    expect(termState.activeTerm).toBe('nebula');
    expect(termState.occurrences.length).toBe(1);
    expect(termState.occurrences[0].threadId).toBe('chat-a');
  });
});
