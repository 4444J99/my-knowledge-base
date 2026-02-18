import type { SearchFacetField } from '@knowledge-base/contracts';
import type {
  AtomicUnit,
  Category,
  Conversation,
  DashboardStats,
  GraphData,
  SearchResult,
  UnitType,
} from '../types';

const configuredApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
export const API_BASE = configuredApiBase ? configuredApiBase.replace(/\/+$/, '') : '/api';

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

export class ApiError extends Error {
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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function asApiResponse<T>(
  value: T,
  pagination?: ApiResponse<T>['pagination']
): ApiResponse<T> {
  return {
    success: true,
    data: value,
    pagination,
    timestamp: nowIso(),
  };
}

export async function requestJson(endpoint: string, options: RequestInit = {}): Promise<unknown> {
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

export function unwrapData<T>(payload: unknown): T | undefined {
  if (isRecord(payload) && payload.success === true && 'data' in payload) {
    return payload.data as T;
  }
  return undefined;
}

export function buildParams(params?: Record<string, string | number | undefined>) {
  if (!params) return '';
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    query.set(key, String(value));
  }
  const rendered = query.toString();
  return rendered ? `?${rendered}` : '';
}

export function normalizeSearchResults(payload: unknown): SearchResult[] {
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

export function normalizeGraphData(payload: unknown): GraphData {
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

export function normalizeStats(payload: unknown): DashboardStats {
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

export function normalizeConversations(payload: unknown): Conversation[] {
  const wrapped = unwrapData<unknown>(payload);
  const source = wrapped ?? payload;
  const entries =
    (isRecord(source) && Array.isArray(source.conversations) ? source.conversations : source) ?? [];

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

export function normalizeWordCloud(payload: unknown): Array<{ text: string; size: number }> {
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

export function normalizeSuggestions(payload: unknown): string[] {
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

export function normalizeSearchFacets(payload: unknown): SearchFacetField[] {
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
