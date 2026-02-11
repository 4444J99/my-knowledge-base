import type { ParallelNetworkEdge } from './index.js';
import type { TermOccurrence } from './index.js';

export interface NetworkNode3D {
  id: string;
  x: number;
  y: number;
  z: number;
}

export interface NetworkNodeProjection {
  id: string;
  x: number;
  y: number;
  scale: number;
}

export interface VisualFrame {
  width: number;
  height: number;
  depth: number;
  radius: number;
}

export interface UniverseSelectionState {
  providerId?: string;
  chatId?: string;
  term?: string;
}

export const DEFAULT_VISUAL_FRAME: VisualFrame = {
  width: 860,
  height: 300,
  depth: 220,
  radius: 110,
};

function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function buildNetworkNodes(
  edges: Pick<ParallelNetworkEdge, 'sourceThreadId' | 'targetThreadId'>[],
  focusId: string,
  frame: VisualFrame = DEFAULT_VISUAL_FRAME,
): NetworkNode3D[] {
  const ids = new Set<string>();
  for (const edge of edges) {
    ids.add(edge.sourceThreadId);
    ids.add(edge.targetThreadId);
  }
  if (focusId) ids.add(focusId);

  const sortedIds = Array.from(ids).sort();
  if (sortedIds.length === 0) return [];

  return sortedIds.map((id, index) => {
    const theta = (index / Math.max(1, sortedIds.length)) * Math.PI * 2;
    const hash = stableHash(id);
    const z = ((hash % 100) / 100 - 0.5) * 2;
    return {
      id,
      x: Math.cos(theta) * frame.radius,
      y: Math.sin(theta) * frame.radius,
      z,
    };
  });
}

export function projectNetworkNode(
  node: NetworkNode3D,
  mode: '2d' | '3d',
  frame: VisualFrame = DEFAULT_VISUAL_FRAME,
): NetworkNodeProjection {
  const centerX = frame.width / 2;
  const centerY = frame.height / 2;

  if (mode === '2d') {
    return {
      id: node.id,
      x: centerX + node.x,
      y: centerY + node.y,
      scale: 1,
    };
  }

  const perspective = frame.depth / (frame.depth + node.z * 90);
  return {
    id: node.id,
    x: centerX + node.x * perspective,
    y: centerY + node.y * perspective,
    scale: perspective,
  };
}

export function projectNetwork(
  edges: Pick<ParallelNetworkEdge, 'sourceThreadId' | 'targetThreadId'>[],
  focusId: string,
  mode: '2d' | '3d',
  frame: VisualFrame = DEFAULT_VISUAL_FRAME,
): Map<string, NetworkNodeProjection> {
  const nodes = buildNetworkNodes(edges, focusId, frame);
  const map = new Map<string, NetworkNodeProjection>();
  for (const node of nodes) {
    map.set(node.id, projectNetworkNode(node, mode, frame));
  }
  return map;
}

export function nextChatSelectionFromEdge(
  edge: Pick<ParallelNetworkEdge, 'sourceThreadId' | 'targetThreadId'>,
  currentChatId?: string,
): string {
  if (currentChatId === edge.sourceThreadId) return edge.targetThreadId;
  if (currentChatId === edge.targetThreadId) return edge.sourceThreadId;
  return edge.sourceThreadId;
}

export function selectionFromOccurrence(
  occurrence: Pick<TermOccurrence, 'providerId' | 'threadId'>,
  current: UniverseSelectionState = {},
): UniverseSelectionState {
  return {
    providerId: occurrence.providerId || current.providerId,
    chatId: occurrence.threadId || current.chatId,
    term: current.term,
  };
}
