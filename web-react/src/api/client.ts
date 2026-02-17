/**
 * API Client
 * Centralized API communication with normalization across legacy and wrapped payloads.
 */

import type {
  ApiListSuccess,
  ApiSuccess,
  SearchFacetField,
  UniverseIngestRun,
  UniverseReindexStart,
} from '@knowledge-base/contracts';
import type {
  AtomicUnit,
  BranchDirection,
  Category,
  Conversation,
  DashboardStats,
  ExportFormat,
  FederatedScanJob,
  FederatedScanRun,
  FederatedSearchHit,
  FederatedSource,
  GraphData,
  SearchResult,
  UnitType,
  UniverseChat,
  UniverseNetworkEdge,
  UniverseProvider,
  UniverseSummary,
  UniverseTermOccurrence,
  UniverseTurn,
  UnitBranchResponse,
} from '../types';

const configuredApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const API_BASE = configuredApiBase ? configuredApiBase.replace(/\/+$/, '') : '/api';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asApiResponse<T>(value: T, pagination?: ApiResponse<T>['pagination']): ApiResponse<T> {
  return {
    success: true,
    data: value,
    pagination,
    timestamp: nowIso(),
  };
}

async function requestJson(endpoint: string, options: RequestInit = {}): Promise<unknown> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message =
      isRecord(error) && typeof error.error === 'string'
        ? error.error
        : `Request failed: ${response.statusText}`;
    throw new ApiError(message, response.status, error);
  }

  return response.json();
}

function unwrapData<T>(payload: unknown): T | undefined {
  if (isRecord(payload) && payload.success === true && 'data' in payload) {
    return payload.data as T;
  }
  return undefined;
}

function buildParams(params?: Record<string, string | number | undefined>) {
  if (!params) return '';
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    query.set(key, String(value));
  }
  const rendered = query.toString();
  return rendered ? `?${rendered}` : '';
}

function normalizeSearchResults(payload: unknown): SearchResult[] {
  const wrapped = unwrapData<unknown>(payload);
  const source = wrapped ?? payload;
  const entries =
    (isRecord(source) && Array.isArray(source.results) ? source.results : source) ?? [];

  if (!Array.isArray(entries)) return [];

  return entries
    .map((entry) => {
      if (!isRecord(entry)) return null;

      if (isRecord(entry.unit)) {
        const score = typeof entry.score === 'number' ? entry.score : 1;
        const highlights = Array.isArray(entry.highlights)
          ? entry.highlights.filter((item): item is string => typeof item === 'string')
          : undefined;
        return { unit: entry.unit as unknown as AtomicUnit, score, highlights };
      }

      return { unit: entry as unknown as AtomicUnit, score: 1 };
    })
    .filter((item): item is SearchResult => item !== null);
}

function normalizeGraphData(payload: unknown): GraphData {
  const wrapped = unwrapData<unknown>(payload);
  const source = wrapped ?? payload;
  if (!isRecord(source)) {
    return { nodes: [], edges: [] };
  }

  const nodes = Array.isArray(source.nodes) ? source.nodes : [];
  const edgesSource = Array.isArray(source.edges) ? source.edges : [];
  const edges = edgesSource
    .map((edge) => {
      if (!isRecord(edge)) return null;
      const relationship =
        typeof edge.relationship === 'string'
          ? edge.relationship
          : typeof edge.type === 'string'
          ? edge.type
          : 'related';
      const strength = typeof edge.strength === 'number' ? edge.strength : 0.5;
      return {
        source: String(edge.source ?? ''),
        target: String(edge.target ?? ''),
        relationship,
        strength,
      };
    })
    .filter((edge): edge is GraphData['edges'][number] => edge !== null);

  return {
    nodes: nodes as GraphData['nodes'],
    edges,
  };
}

function normalizeStats(payload: unknown): DashboardStats {
  const wrapped = unwrapData<unknown>(payload);
  const source = wrapped ?? payload;

  if (!isRecord(source)) {
    return {
      totalUnits: 0,
      totalConversations: 0,
      totalTags: 0,
      unitsByType: {
        insight: 0,
        code: 0,
        question: 0,
        reference: 0,
        decision: 0,
      },
      unitsByCategory: {
        programming: 0,
        writing: 0,
        research: 0,
        design: 0,
        general: 0,
      },
      recentUnits: [],
    };
  }

  const readCount = (value: unknown) => {
    if (typeof value === 'number') return value;
    if (isRecord(value) && typeof value.count === 'number') return value.count;
    return 0;
  };

  const unitsByTypeArray = Array.isArray(source.unitsByType) ? source.unitsByType : [];
  const unitsByTypeRecord = unitsByTypeArray.reduce<Record<UnitType, number>>(
    (acc, row) => {
      if (isRecord(row) && typeof row.type === 'string' && typeof row.count === 'number') {
        const key = row.type as UnitType;
        if (key in acc) acc[key] = row.count;
      }
      return acc;
    },
    {
      insight: 0,
      code: 0,
      question: 0,
      reference: 0,
      decision: 0,
    }
  );

  const unitsByCategory = (
    isRecord(source.unitsByCategory) ? source.unitsByCategory : {}
  ) as Record<Category, number>;

  return {
    totalUnits: readCount(source.totalUnits),
    totalConversations: readCount(source.totalConversations),
    totalTags: readCount(source.totalTags),
    unitsByType: unitsByTypeRecord,
    unitsByCategory: {
      programming: unitsByCategory.programming ?? 0,
      writing: unitsByCategory.writing ?? 0,
      research: unitsByCategory.research ?? 0,
      design: unitsByCategory.design ?? 0,
      general: unitsByCategory.general ?? 0,
    },
    recentUnits: Array.isArray(source.recentUnits) ? (source.recentUnits as AtomicUnit[]) : [],
  };
}

function normalizeConversations(payload: unknown): Conversation[] {
  const wrapped = unwrapData<unknown>(payload);
  const source = wrapped ?? payload;
  const entries =
    (isRecord(source) && Array.isArray(source.conversations)
      ? source.conversations
      : source) ?? [];

  if (!Array.isArray(entries)) return [];

  return entries
    .map((entry) => {
      if (!isRecord(entry) || typeof entry.id !== 'string') return null;
      return {
        id: entry.id,
        title: typeof entry.title === 'string' ? entry.title : 'Untitled Conversation',
        source: typeof entry.source === 'string' ? entry.source : 'unknown',
        unitCount: typeof entry.unitCount === 'number' ? entry.unitCount : 0,
        timestamp:
          typeof entry.timestamp === 'string'
            ? entry.timestamp
            : typeof entry.created === 'string'
            ? entry.created
            : nowIso(),
      };
    })
    .filter((entry): entry is Conversation => entry !== null);
}

function normalizeWordCloud(payload: unknown): Array<{ text: string; size: number }> {
  const wrapped = unwrapData<unknown>(payload);
  const source = wrapped ?? payload;
  const entries = (isRecord(source) && Array.isArray(source.data) ? source.data : source) ?? [];
  if (!Array.isArray(entries)) return [];

  return entries
    .map((entry) => {
      if (!isRecord(entry) || typeof entry.text !== 'string') return null;
      const raw =
        typeof entry.size === 'number'
          ? entry.size
          : typeof entry.normalizedValue === 'number'
          ? entry.normalizedValue
          : typeof entry.value === 'number'
          ? entry.value
          : 1;
      return { text: entry.text, size: raw };
    })
    .filter((entry): entry is { text: string; size: number } => entry !== null);
}

function normalizeSuggestions(payload: unknown): string[] {
  const wrapped = unwrapData<unknown>(payload);
  const source = wrapped ?? payload;

  if (Array.isArray(source)) {
    return source
      .map((item) => {
        if (typeof item === 'string') return item;
        if (isRecord(item) && typeof item.text === 'string') return item.text;
        return null;
      })
      .filter((item): item is string => item !== null);
  }

  if (isRecord(payload) && Array.isArray(payload.suggestions)) {
    return payload.suggestions.filter((item): item is string => typeof item === 'string');
  }

  return [];
}

function normalizeSearchFacets(payload: unknown): SearchFacetField[] {
  const wrapped = unwrapData<unknown>(payload);
  const source = wrapped ?? payload;
  const entries = Array.isArray(source)
    ? source
    : isRecord(source) && Array.isArray(source.facets)
    ? source.facets
    : [];

  const normalized: SearchFacetField[] = [];
  for (const entry of entries) {
    if (!isRecord(entry) || typeof entry.field !== 'string' || !Array.isArray(entry.buckets)) {
      continue;
    }

    const buckets: SearchFacetField['buckets'] = [];
    for (const bucket of entry.buckets) {
      if (!isRecord(bucket) || typeof bucket.value !== 'string' || typeof bucket.count !== 'number') {
        continue;
      }

      const normalizedBucket: SearchFacetField['buckets'][number] = {
        value: bucket.value,
        count: bucket.count,
      };

      if (typeof bucket.startDate === 'string') {
        normalizedBucket.startDate = bucket.startDate;
      }
      if (typeof bucket.endDate === 'string') {
        normalizedBucket.endDate = bucket.endDate;
      }

      buckets.push(normalizedBucket);
    }

    normalized.push({
      field: entry.field,
      buckets,
    });
  }

  return normalized;
}

// Units API
export const unitsApi = {
  list: async (params?: { limit?: number; offset?: number }) => {
    const pageSize = params?.limit ?? 20;
    const page = params?.offset ? Math.floor(params.offset / pageSize) + 1 : 1;
    const payload = await requestJson(
      `/units${buildParams({
        page,
        pageSize,
      })}`
    );

    const wrapped = unwrapData<AtomicUnit[]>(payload);
    if (wrapped) {
      const pagination =
        isRecord(payload) && isRecord(payload.pagination)
          ? {
              page: Number(payload.pagination.page) || page,
              pageSize: Number(payload.pagination.pageSize) || pageSize,
              total: Number(payload.pagination.total) || wrapped.length,
              totalPages: Number(payload.pagination.totalPages) || 1,
            }
          : undefined;
      return asApiResponse(wrapped, pagination);
    }

    if (isRecord(payload) && Array.isArray(payload.units)) {
      return asApiResponse(payload.units as AtomicUnit[]);
    }

    return asApiResponse([]);
  },

  get: async (id: string) => {
    const payload = await requestJson(`/units/${id}`);
    const wrapped = unwrapData<AtomicUnit>(payload);
    if (wrapped) return asApiResponse(wrapped);
    return asApiResponse(payload as AtomicUnit);
  },

  create: async (unit: Partial<AtomicUnit>) => {
    const payload = await requestJson('/units', {
      method: 'POST',
      body: JSON.stringify(unit),
    });
    const wrapped = unwrapData<AtomicUnit>(payload);
    return asApiResponse((wrapped ?? payload) as AtomicUnit);
  },

  update: async (id: string, updates: Partial<AtomicUnit>) => {
    const payload = await requestJson(`/units/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    const wrapped = unwrapData<AtomicUnit>(payload);
    return asApiResponse((wrapped ?? payload) as AtomicUnit);
  },

  delete: async (id: string) => {
    const payload = await requestJson(`/units/${id}`, { method: 'DELETE' });
    const wrapped = unwrapData<void>(payload);
    return asApiResponse(wrapped);
  },

  getRelated: async (id: string) => {
    try {
      const payload = await requestJson(`/units/${id}/related`);
      const wrapped = unwrapData<AtomicUnit[]>(payload);
      return asApiResponse((wrapped ?? payload) as AtomicUnit[]);
    } catch {
      return asApiResponse([]);
    }
  },

  getBranches: async (
    id: string,
    params?: {
      depth?: number;
      direction?: BranchDirection;
      limitPerNode?: number;
      relationshipType?: string;
    }
  ) => {
    const payload = await requestJson(`/units/${id}/branches${buildParams(params)}`);
    const wrapped = unwrapData<UnitBranchResponse>(payload);
    return asApiResponse((wrapped ?? payload) as UnitBranchResponse);
  },
};

// Search API
export const searchApi = {
  fts: async (query: string, params?: Record<string, string | number>) => {
    const payload = await requestJson(
      `/search/fts${buildParams({ q: query, ...params })}`
    );
    const results = normalizeSearchResults(payload);
    return asApiResponse(results);
  },

  semantic: async (query: string, params?: Record<string, string | number>) => {
    const payload = await requestJson(
      `/search/semantic${buildParams({ q: query, ...params })}`
    );
    const results = normalizeSearchResults(payload);
    return asApiResponse(results);
  },

  hybrid: async (query: string, params?: Record<string, string | number>) => {
    const payload = await requestJson(
      `/search/hybrid${buildParams({ q: query, ...params })}`
    );
    const results = normalizeSearchResults(payload);
    return asApiResponse(results);
  },

  suggestions: async (query: string) => {
    const payload = await requestJson(`/search/suggestions${buildParams({ q: query })}`);
    return asApiResponse(normalizeSuggestions(payload));
  },

  facets: async () => {
    const payload = await requestJson('/search/facets');
    return asApiResponse(normalizeSearchFacets(payload));
  },
};

// Federation API
export const federationApi = {
  listSources: async () => {
    const payload = await requestJson('/federation/sources');
    const wrapped = unwrapData<FederatedSource[]>(payload);
    return asApiResponse(wrapped ?? []);
  },

  createSource: async (input: {
    name: string;
    rootPath: string;
    kind?: 'local-filesystem';
    includePatterns?: string[];
    excludePatterns?: string[];
    metadata?: Record<string, unknown>;
  }) => {
    const payload = await requestJson('/federation/sources', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    const wrapped = unwrapData<FederatedSource>(payload);
    return asApiResponse((wrapped ?? payload) as FederatedSource);
  },

  updateSource: async (
    id: string,
    updates: {
      name?: string;
      status?: 'active' | 'disabled';
      rootPath?: string;
      includePatterns?: string[];
      excludePatterns?: string[];
      metadata?: Record<string, unknown>;
    }
  ) => {
    const payload = await requestJson(`/federation/sources/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    const wrapped = unwrapData<FederatedSource>(payload);
    return asApiResponse((wrapped ?? payload) as FederatedSource);
  },

  scanSource: async (id: string, mode: 'incremental' | 'full' = 'incremental') => {
    const payload = await requestJson(`/federation/sources/${id}/scan`, {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
    const wrapped = unwrapData<FederatedScanJob>(payload);
    return asApiResponse((wrapped ?? payload) as FederatedScanJob);
  },

  listScans: async (id: string, limit: number = 20) => {
    const payload = await requestJson(`/federation/sources/${id}/scans${buildParams({ limit })}`);
    const wrapped = unwrapData<FederatedScanRun[]>(payload);
    return asApiResponse(wrapped ?? []);
  },

  listJobs: async (params?: {
    sourceId?: string;
    status?: FederatedScanJob['status'];
    limit?: number;
    offset?: number;
  }) => {
    const payload = await requestJson(`/federation/jobs${buildParams(params)}`);
    const wrapped = unwrapData<FederatedScanJob[]>(payload);
    return asApiResponse(wrapped ?? []);
  },

  cancelJob: async (id: string) => {
    const payload = await requestJson(`/federation/jobs/${id}/cancel`, {
      method: 'POST',
    });
    const wrapped = unwrapData<FederatedScanJob>(payload);
    return asApiResponse((wrapped ?? payload) as FederatedScanJob);
  },

  search: async (
    query: string,
    params?: {
      sourceId?: string;
      mimeType?: string;
      pathPrefix?: string;
      modifiedAfter?: string;
      modifiedBefore?: string;
      limit?: number;
      offset?: number;
    }
  ) => {
    const payload = await requestJson(`/federation/search${buildParams({ q: query, ...params })}`);
    const wrapped = unwrapData<FederatedSearchHit[]>(payload);
    return asApiResponse(wrapped ?? []);
  },
};

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
    const payload = await requestJson(`/graph${buildParams(params)}`);
    return asApiResponse(normalizeGraphData(payload));
  },

  getNeighborhood: async (id: string, hops?: number) => {
    const payload = await requestJson(
      `/graph${buildParams({
        focusId: id,
        hops: hops ?? 1,
      })}`
    );
    return asApiResponse(normalizeGraphData(payload));
  },

  getStats: async () => {
    const payload = await requestJson('/graph/stats');
    const wrapped = unwrapData<Record<string, number>>(payload);
    return asApiResponse(wrapped ?? (payload as Record<string, number>));
  },
};

// Stats API
export const statsApi = {
  getDashboard: async () => {
    const payload = await requestJson('/stats');
    return asApiResponse(normalizeStats(payload));
  },

  getWordCloud: async (params?: { source?: string; limit?: number }) => {
    const query = buildParams(params);
    try {
      const payload = await requestJson(`/stats/wordcloud${query}`);
      return asApiResponse(normalizeWordCloud(payload));
    } catch {
      const payload = await requestJson(`/wordcloud${query}`);
      return asApiResponse(normalizeWordCloud(payload));
    }
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

// Universe API
export const universeApi = {
  summary: async (): Promise<ApiSuccess<UniverseSummary>> =>
    (await requestJson('/universe/summary')) as ApiSuccess<UniverseSummary>,

  providers: async (params?: { limit?: number; offset?: number }): Promise<ApiListSuccess<UniverseProvider>> =>
    (await requestJson(`/universe/providers${buildParams(params)}`)) as ApiListSuccess<UniverseProvider>,

  providerChats: async (
    providerId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<ApiListSuccess<UniverseChat>> =>
    (await requestJson(
      `/universe/providers/${encodeURIComponent(providerId)}/chats${buildParams(params)}`,
    )) as ApiListSuccess<UniverseChat>,

  chat: async (chatId: string): Promise<ApiSuccess<UniverseChat>> =>
    (await requestJson(`/universe/chats/${encodeURIComponent(chatId)}`)) as ApiSuccess<UniverseChat>,

  chatTurns: async (
    chatId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<ApiListSuccess<UniverseTurn>> =>
    (await requestJson(
      `/universe/chats/${encodeURIComponent(chatId)}/turns${buildParams(params)}`,
    )) as ApiListSuccess<UniverseTurn>,

  chatNetwork: async (chatId: string, params?: { limit?: number }): Promise<ApiSuccess<UniverseNetworkEdge[]>> =>
    (await requestJson(
      `/universe/chats/${encodeURIComponent(chatId)}/network${buildParams(params)}`,
    )) as ApiSuccess<UniverseNetworkEdge[]>,

  termOccurrences: async (
    term: string,
    params?: { limit?: number; offset?: number },
  ): Promise<ApiListSuccess<UniverseTermOccurrence>> =>
    (await requestJson(
      `/universe/terms/${encodeURIComponent(term)}/occurrences${buildParams(params)}`,
    )) as ApiListSuccess<UniverseTermOccurrence>,

  parallelNetworks: async (
    params?: { limit?: number; minWeight?: number },
  ): Promise<ApiSuccess<UniverseNetworkEdge[]>> =>
    (await requestJson(`/universe/networks/parallel${buildParams(params)}`)) as ApiSuccess<
      UniverseNetworkEdge[]
    >,

  reindex: async (): Promise<ApiSuccess<UniverseReindexStart>> =>
    (await requestJson('/universe/reindex', { method: 'POST' })) as ApiSuccess<UniverseReindexStart>,

  reindexStatus: async (runId: string): Promise<ApiSuccess<UniverseIngestRun>> =>
    (await requestJson(`/universe/reindex/${encodeURIComponent(runId)}`)) as ApiSuccess<UniverseIngestRun>,
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
