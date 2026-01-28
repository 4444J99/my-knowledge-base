/**
 * Data Store
 * Manages units, tags, conversations, and stats
 */

import { create } from 'zustand';
import type { AtomicUnit, Tag, Conversation, DashboardStats, GraphData } from '../types';

interface DataState {
  // Units
  units: AtomicUnit[];
  setUnits: (units: AtomicUnit[]) => void;
  addUnit: (unit: AtomicUnit) => void;
  updateUnit: (id: string, updates: Partial<AtomicUnit>) => void;
  removeUnit: (id: string) => void;

  // Tags
  tags: Tag[];
  setTags: (tags: Tag[]) => void;
  tagsLoading: boolean;
  setTagsLoading: (loading: boolean) => void;

  // Conversations
  conversations: Conversation[];
  setConversations: (conversations: Conversation[]) => void;
  conversationsLoading: boolean;
  setConversationsLoading: (loading: boolean) => void;

  // Dashboard stats
  stats: DashboardStats | null;
  setStats: (stats: DashboardStats) => void;
  statsLoading: boolean;
  setStatsLoading: (loading: boolean) => void;

  // Graph data
  graphData: GraphData | null;
  setGraphData: (data: GraphData) => void;
  graphLoading: boolean;
  setGraphLoading: (loading: boolean) => void;
  graphFilters: {
    limit: number;
    type: string;
    category: string;
    focusId: string;
    hops: number;
  };
  setGraphFilters: (filters: Partial<DataState['graphFilters']>) => void;

  // Word cloud data
  wordCloudData: Array<{ text: string; size: number }>;
  setWordCloudData: (data: Array<{ text: string; size: number }>) => void;
}

export const useDataStore = create<DataState>((set) => ({
  // Units
  units: [],
  setUnits: (units) => set({ units }),
  addUnit: (unit) => set((state) => ({ units: [...state.units, unit] })),
  updateUnit: (id, updates) =>
    set((state) => ({
      units: state.units.map((u) => (u.id === id ? { ...u, ...updates } : u)),
    })),
  removeUnit: (id) =>
    set((state) => ({
      units: state.units.filter((u) => u.id !== id),
    })),

  // Tags
  tags: [],
  setTags: (tags) => set({ tags }),
  tagsLoading: false,
  setTagsLoading: (loading) => set({ tagsLoading: loading }),

  // Conversations
  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  conversationsLoading: false,
  setConversationsLoading: (loading) => set({ conversationsLoading: loading }),

  // Dashboard stats
  stats: null,
  setStats: (stats) => set({ stats }),
  statsLoading: false,
  setStatsLoading: (loading) => set({ statsLoading: loading }),

  // Graph data
  graphData: null,
  setGraphData: (data) => set({ graphData: data }),
  graphLoading: false,
  setGraphLoading: (loading) => set({ graphLoading: loading }),
  graphFilters: {
    limit: 50,
    type: '',
    category: '',
    focusId: '',
    hops: 1,
  },
  setGraphFilters: (filters) =>
    set((state) => ({
      graphFilters: { ...state.graphFilters, ...filters },
    })),

  // Word cloud data
  wordCloudData: [],
  setWordCloudData: (data) => set({ wordCloudData: data }),
}));
