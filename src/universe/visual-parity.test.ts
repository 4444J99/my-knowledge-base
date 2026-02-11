import { describe, expect, it } from 'vitest';
import {
  buildNetworkNodes,
  nextChatSelectionFromEdge,
  projectNetwork,
  selectionFromOccurrence,
} from '@knowledge-base/contracts';

describe('Universe visual parity helpers', () => {
  const edges = [
    { sourceThreadId: 'chat-a', targetThreadId: 'chat-b' },
    { sourceThreadId: 'chat-b', targetThreadId: 'chat-c' },
    { sourceThreadId: 'chat-c', targetThreadId: 'chat-d' },
  ];

  it('builds deterministic node ids from edges', () => {
    const first = buildNetworkNodes(edges, 'chat-focus');
    const second = buildNetworkNodes(edges, 'chat-focus');

    expect(first.map((node) => node.id)).toEqual(second.map((node) => node.id));
    expect(first.some((node) => node.id === 'chat-focus')).toBe(true);
  });

  it('preserves node identity parity between 2d and 3d projections', () => {
    const projected2d = projectNetwork(edges, 'chat-a', '2d');
    const projected3d = projectNetwork(edges, 'chat-a', '3d');

    const ids2d = Array.from(projected2d.keys()).sort();
    const ids3d = Array.from(projected3d.keys()).sort();
    expect(ids2d).toEqual(ids3d);
  });

  it('keeps all projected nodes in visible positive frame space', () => {
    const projected = projectNetwork(edges, 'chat-a', '3d');
    for (const node of projected.values()) {
      expect(node.x).toBeGreaterThan(0);
      expect(node.y).toBeGreaterThan(0);
      expect(node.scale).toBeGreaterThan(0);
    }
  });

  it('uses the same edge selection transition for any render mode', () => {
    const edge = { sourceThreadId: 'chat-a', targetThreadId: 'chat-b' };
    expect(nextChatSelectionFromEdge(edge, 'chat-a')).toBe('chat-b');
    expect(nextChatSelectionFromEdge(edge, 'chat-b')).toBe('chat-a');
    expect(nextChatSelectionFromEdge(edge, 'unknown')).toBe('chat-a');
  });

  it('builds deterministic occurrence drill-down selection state', () => {
    const selection = selectionFromOccurrence(
      { providerId: 'chatgpt', threadId: 'chat-1' },
      { providerId: 'claude', chatId: 'chat-z', term: 'nebula' },
    );
    expect(selection).toEqual({
      providerId: 'chatgpt',
      chatId: 'chat-1',
      term: 'nebula',
    });
  });
});
