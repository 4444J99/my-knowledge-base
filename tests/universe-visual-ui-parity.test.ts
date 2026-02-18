// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UniverseTab } from '../web-react/src/components/tabs/UniverseTab';

// React 19 act() guard for jsdom-based tests.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => {
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
  ];
  const chats = [
    {
      id: 'chat-a',
      providerRefId: 'provider-chatgpt',
      accountRefId: undefined,
      externalThreadId: undefined,
      title: 'Alpha Chat',
      sourcePath: '/intake/chatgpt/alpha.json',
      createdAt: timestamp,
      updatedAt: timestamp,
      metadata: {},
      providerId: 'chatgpt',
      providerName: 'ChatGPT',
      turnCount: 1,
    },
    {
      id: 'chat-b',
      providerRefId: 'provider-chatgpt',
      accountRefId: undefined,
      externalThreadId: undefined,
      title: 'Beta Chat',
      sourcePath: '/intake/chatgpt/beta.json',
      createdAt: timestamp,
      updatedAt: timestamp,
      metadata: {},
      providerId: 'chatgpt',
      providerName: 'ChatGPT',
      turnCount: 1,
    },
  ];
  const turnsByChat: Record<string, Array<Record<string, unknown>>> = {
    'chat-a': [
      {
        id: 'turn-a-1',
        threadId: 'chat-a',
        turnIndex: 1,
        role: 'user',
        content: 'alpha nebula',
        metadata: {},
      },
    ],
    'chat-b': [
      {
        id: 'turn-b-1',
        threadId: 'chat-b',
        turnIndex: 1,
        role: 'assistant',
        content: 'beta quasar',
        metadata: {},
      },
    ],
  };
  const edges = [
    {
      id: 'edge-a-b',
      sourceThreadId: 'chat-a',
      targetThreadId: 'chat-b',
      edgeType: 'semantic',
      weight: 3,
      evidence: {},
    },
  ];

  return {
    summary: vi.fn(async () => ({
      success: true,
      data: {
        providers: 1,
        accounts: 1,
        chats: 2,
        turns: 2,
        terms: 2,
        occurrences: 2,
        updatedAt: timestamp,
      },
      timestamp,
    })),
    providers: vi.fn(async () => ({
      success: true,
      data: providers,
      pagination: { limit: 200, offset: 0, total: providers.length, totalPages: 1 },
      timestamp,
    })),
    providerChats: vi.fn(async () => ({
      success: true,
      data: chats,
      pagination: { limit: 500, offset: 0, total: chats.length, totalPages: 1 },
      timestamp,
    })),
    chat: vi.fn(async (chatId: string) => ({
      success: true,
      data: chats.find((chat) => chat.id === chatId) ?? chats[0],
      timestamp,
    })),
    chatTurns: vi.fn(async (chatId: string) => ({
      success: true,
      data: turnsByChat[chatId] ?? [],
      pagination: { limit: 1000, offset: 0, total: (turnsByChat[chatId] ?? []).length, totalPages: 1 },
      timestamp,
    })),
    chatNetwork: vi.fn(async () => ({
      success: true,
      data: edges,
      timestamp,
    })),
    termOccurrences: vi.fn(async () => ({
      success: true,
      data: [],
      pagination: { limit: 500, offset: 0, total: 0, totalPages: 0 },
      timestamp,
    })),
    parallelNetworks: vi.fn(async () => ({
      success: true,
      data: edges,
      timestamp,
    })),
    reindex: vi.fn(async () => ({
      success: true,
      data: { runId: 'run-1', status: 'running' },
      timestamp,
    })),
    reindexStatus: vi.fn(async () => ({
      success: true,
      data: {
        id: 'run-1',
        sourceRoot: '/intake',
        status: 'completed',
        filesScanned: 1,
        filesIngested: 1,
        filesQuarantined: 0,
        chatsIngested: 2,
        turnsIngested: 2,
        startedAt: timestamp,
        completedAt: timestamp,
        metadata: {},
      },
      timestamp,
    })),
  };
});

vi.mock('../web-react/src/api/universe', () => ({
  universeApi: {
    summary: mocks.summary,
    providers: mocks.providers,
    providerChats: mocks.providerChats,
    chat: mocks.chat,
    chatTurns: mocks.chatTurns,
    chatNetwork: mocks.chatNetwork,
    termOccurrences: mocks.termOccurrences,
    parallelNetworks: mocks.parallelNetworks,
    reindex: mocks.reindex,
    reindexStatus: mocks.reindexStatus,
  },
}));

async function waitFor(condition: () => boolean, timeoutMs: number = 3000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (condition()) return;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  }
  throw new Error('Timed out waiting for condition');
}

function getButtonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find((node) =>
    node.textContent?.includes(text),
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected button containing "${text}"`);
  }
  return button;
}

function hasButtonWithText(container: HTMLElement, text: string): boolean {
  return Array.from(container.querySelectorAll('button')).some((node) => node.textContent?.includes(text));
}

describe('Universe UI visual parity (2D/3D)', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
    }
    root = null;
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    vi.clearAllMocks();
  });

  it('keeps edge-click selection transitions identical in 2D and 3D modes', async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        React.createElement(
          QueryClientProvider,
          { client },
          React.createElement(UniverseTab),
        ),
      );
    });

    await waitFor(() => container!.textContent?.includes('Alpha Chat') === true);
    await waitFor(
      () => getButtonByText(container!, 'Alpha Chat').className.includes('border-[var(--accent-2)]'),
    );

    await waitFor(() => hasButtonWithText(container!, 'chat-a') && hasButtonWithText(container!, 'chat-b'));
    const edgeButton = getButtonByText(container, 'chat-a');
    await act(async () => {
      edgeButton.click();
    });

    await waitFor(
      () => getButtonByText(container!, 'Beta Chat').className.includes('border-[var(--accent-2)]'),
    );
    expect(mocks.chatTurns).toHaveBeenCalledWith('chat-b', { limit: 1000 });

    const modeToggle = getButtonByText(container, 'Mode: 2D');
    await act(async () => {
      modeToggle.click();
    });
    await waitFor(() => container!.textContent?.includes('Mode: 3D') === true);

    await waitFor(() => hasButtonWithText(container!, 'chat-a') && hasButtonWithText(container!, 'chat-b'));
    const edgeButtonIn3d = getButtonByText(container, 'chat-a');
    await act(async () => {
      edgeButtonIn3d.click();
    });

    await waitFor(
      () => getButtonByText(container!, 'Alpha Chat').className.includes('border-[var(--accent-2)]'),
    );
    expect(mocks.chatTurns).toHaveBeenCalledWith('chat-a', { limit: 1000 });
  });
});
