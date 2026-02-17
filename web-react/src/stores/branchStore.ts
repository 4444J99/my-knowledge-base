import { create } from 'zustand';
import type { BranchDirection } from '../types';

interface BranchState {
  rootUnitId: string | null;
  depth: number;
  direction: BranchDirection;
  limitPerNode: number;
  relationshipType: string;
  selectedPath: string[];
  setRootUnit: (unitId: string) => void;
  clearRoot: () => void;
  selectUnitAtDepth: (depth: number, unitId: string) => void;
  resetSelection: () => void;
  setDepth: (depth: number) => void;
  setDirection: (direction: BranchDirection) => void;
  setLimitPerNode: (limit: number) => void;
  setRelationshipType: (relationshipType: string) => void;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const useBranchStore = create<BranchState>((set, get) => ({
  rootUnitId: null,
  depth: 3,
  direction: 'out',
  limitPerNode: 12,
  relationshipType: '',
  selectedPath: [],

  setRootUnit: (unitId) =>
    set({
      rootUnitId: unitId,
      selectedPath: unitId ? [unitId] : [],
    }),

  clearRoot: () =>
    set({
      rootUnitId: null,
      selectedPath: [],
    }),

  selectUnitAtDepth: (depth, unitId) =>
    set((state) => {
      if (!state.rootUnitId) {
        return state;
      }

      const normalizedDepth = Math.max(0, depth);
      if (normalizedDepth === 0) {
        return {
          rootUnitId: unitId,
          selectedPath: [unitId],
        };
      }

      const nextPath = state.selectedPath.slice(0, normalizedDepth);
      if (nextPath.length === 0) {
        nextPath.push(state.rootUnitId);
      }
      nextPath[0] = state.rootUnitId;
      nextPath[normalizedDepth] = unitId;

      return {
        selectedPath: nextPath.slice(0, normalizedDepth + 1),
      };
    }),

  resetSelection: () =>
    set((state) => ({
      selectedPath: state.rootUnitId ? [state.rootUnitId] : [],
    })),

  setDepth: (depth) =>
    set({
      depth: clamp(depth, 1, 4),
    }),

  setDirection: (direction) =>
    set({
      direction,
    }),

  setLimitPerNode: (limit) =>
    set({
      limitPerNode: clamp(limit, 1, 25),
    }),

  setRelationshipType: (relationshipType) =>
    set({
      relationshipType: relationshipType.trim(),
      selectedPath: get().rootUnitId ? [get().rootUnitId as string] : [],
    }),
}));
