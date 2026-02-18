/**
 * API Client
 * Domain clients are split into focused modules; this file remains a compatibility barrel.
 */

import type { AtomicUnit, Conversation, ExportFormat, GraphData } from '../types';
import type { ApiResponse } from './core';
import {
  API_BASE,
  ApiError,
  asApiResponse,
  normalizeConversations,
  normalizeGraphData,
  requestJson,
  unwrapData,
  isRecord,
} from './core';
import { federationApi } from './federation';
import { searchApi } from './search';
import { statsApi } from './stats';
import { unitsApi } from './units';
import { universeApi } from './universe';

// Re-export shared types and split domain clients.
export type { ApiResponse };
export { API_BASE, ApiError };
export { unitsApi, searchApi, federationApi, statsApi, universeApi };

// Tags API
export const tagsApi = {
  list: async () => {
    const payload = await requestJson('/tags');
    const wrapped = unwrapData<unknown>(payload);
    const source = wrapped ?? payload;

    if (Array.isArray(source)) {
      if (source.every((item) => typeof item === 'string')) {
        return asApiResponse(source.map((name) => ({ name, count: 0 })));
      }
      return asApiResponse(source as Array<{ name: string; count: number }>);
    }

    if (isRecord(source) && Array.isArray(source.tags)) {
      const tags = source.tags;
      if (tags.every((item) => typeof item === 'string')) {
        return asApiResponse(tags.map((name) => ({ name, count: 0 })));
      }
      return asApiResponse(tags as Array<{ name: string; count: number }>);
    }

    return asApiResponse([]);
  },

  getUnits: async (tag: string) => {
    const payload = await requestJson(`/tags/${encodeURIComponent(tag)}/units`);
    const wrapped = unwrapData<AtomicUnit[]>(payload);
    if (wrapped) return asApiResponse(wrapped);
    if (isRecord(payload) && Array.isArray(payload.units)) {
      return asApiResponse(payload.units as AtomicUnit[]);
    }
    return asApiResponse([]);
  },

  add: async (unitId: string, tags: string[]) => {
    const payload = await requestJson(`/units/${unitId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tags }),
    });
    const wrapped = unwrapData<void>(payload);
    return asApiResponse(wrapped);
  },

  remove: async (unitId: string, tag: string) => {
    const payload = await requestJson(`/units/${unitId}/tags/${encodeURIComponent(tag)}`, {
      method: 'DELETE',
    });
    const wrapped = unwrapData<void>(payload);
    return asApiResponse(wrapped);
  },
};

// Graph API
export const graphApi = {
  getVisualization: async (params?: {
    limit?: number;
    type?: string;
    category?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    if (params?.type) query.set('type', params.type);
    if (params?.category) query.set('category', params.category);
    const suffix = query.toString() ? `?${query.toString()}` : '';

    const payload = await requestJson(`/graph${suffix}`);
    return asApiResponse(normalizeGraphData(payload));
  },

  getNeighborhood: async (id: string, hops?: number) => {
    const query = new URLSearchParams();
    query.set('focusId', id);
    query.set('hops', String(hops ?? 1));
    const payload = await requestJson(`/graph?${query.toString()}`);
    return asApiResponse(normalizeGraphData(payload));
  },

  getStats: async () => {
    const payload = await requestJson('/graph/stats');
    const wrapped = unwrapData<Record<string, number>>(payload);
    return asApiResponse(wrapped ?? (payload as Record<string, number>));
  },
};

// Conversations API
export const conversationsApi = {
  list: async () => {
    const payload = await requestJson('/conversations');
    return asApiResponse(normalizeConversations(payload));
  },

  get: async (id: string) => {
    const payload = await requestJson(`/conversations/${id}`);
    const wrapped = unwrapData<Conversation>(payload);
    return asApiResponse((wrapped ?? payload) as Conversation);
  },
};

// Export API
export const exportApi = {
  getFormats: async () => {
    const payload = await requestJson('/export/formats');
    const wrapped = unwrapData<ExportFormat[]>(payload);
    return asApiResponse(wrapped ?? []);
  },

  export: async (
    units: AtomicUnit[],
    format: string,
    options?: Record<string, unknown>
  ): Promise<Blob> => {
    const response = await fetch(`${API_BASE}/export/${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ units, options }),
    });
    if (!response.ok) {
      throw new ApiError(`Export failed: ${response.statusText}`, response.status);
    }
    return response.blob();
  },
};

// Categories API
export const categoriesApi = {
  list: async () => {
    const payload = await requestJson('/categories');
    const wrapped = unwrapData<string[]>(payload);
    if (wrapped) return asApiResponse(wrapped);

    if (isRecord(payload) && Array.isArray(payload.categories)) {
      const names = payload.categories
        .map((entry) => {
          if (typeof entry === 'string') return entry;
          if (isRecord(entry) && typeof entry.category === 'string') return entry.category;
          return null;
        })
        .filter((entry): entry is string => entry !== null);
      return asApiResponse(names);
    }

    return asApiResponse([]);
  },

  getUnits: async (category: string) => {
    const payload = await requestJson(`/units/by-category/${category}`);
    const wrapped = unwrapData<AtomicUnit[]>(payload);
    return asApiResponse(wrapped ?? []);
  },
};

// Health API
export const healthApi = {
  check: () => requestJson('/health') as Promise<{ status: string; timestamp: string }>,
};

// Config API
export const configApi = {
  get: () =>
    requestJson('/config') as Promise<
      ApiResponse<{
        config: { llm?: Record<string, unknown> };
        env: Record<string, unknown>;
      }>
    >,

  update: (updates: unknown) =>
    requestJson('/config', {
      method: 'POST',
      body: JSON.stringify(updates),
    }) as Promise<{ success: boolean; message: string }>,

  testLLM: (data: { provider: string; apiKey?: string; baseUrl?: string; model?: string }) =>
    requestJson('/config/test-llm', {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<{ success: boolean; response?: string; error?: string }>,

  listModels: (data: { provider: string; apiKey?: string; baseUrl?: string }) =>
    requestJson('/config/models', {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<{ models: string[] }>,
};

export type { GraphData };
