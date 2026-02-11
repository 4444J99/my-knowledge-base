import type {
  ApiListSuccess,
  ApiSuccess,
  PagedRequest,
  TermOccurrence,
  UniverseChat,
  UniverseIngestRun,
  UniverseProvider,
  UniverseReindexStart,
  UniverseSummary,
  UniverseTurn,
} from '@knowledge-base/contracts';

export interface DesktopUniverseClientConfig {
  baseUrl: string;
  authHeader?: string;
  fetchImpl?: typeof fetch;
}

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function buildQuery(params?: PagedRequest): string {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  if (params.offset !== undefined) search.set('offset', String(params.offset));
  const query = search.toString();
  return query ? `?${query}` : '';
}

function makeHeaders(authHeader?: string): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authHeader) headers.Authorization = authHeader;
  return headers;
}

export class DesktopUniverseClient {
  private readonly baseUrl: string;
  private readonly authHeader?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: DesktopUniverseClientConfig) {
    this.baseUrl = trimTrailingSlashes(config.baseUrl);
    this.authHeader = config.authHeader;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...makeHeaders(this.authHeader),
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}) for ${path}`);
    }
    return (await response.json()) as T;
  }

  summary(): Promise<ApiSuccess<UniverseSummary>> {
    return this.request<ApiSuccess<UniverseSummary>>('/universe/summary');
  }

  providers(params?: PagedRequest): Promise<ApiListSuccess<UniverseProvider>> {
    return this.request<ApiListSuccess<UniverseProvider>>(`/universe/providers${buildQuery(params)}`);
  }

  providerChats(providerId: string, params?: PagedRequest): Promise<ApiListSuccess<UniverseChat>> {
    return this.request<ApiListSuccess<UniverseChat>>(
      `/universe/providers/${encodeURIComponent(providerId)}/chats${buildQuery(params)}`,
    );
  }

  chatTurns(chatId: string, params?: PagedRequest): Promise<ApiListSuccess<UniverseTurn>> {
    return this.request<ApiListSuccess<UniverseTurn>>(
      `/universe/chats/${encodeURIComponent(chatId)}/turns${buildQuery(params)}`,
    );
  }

  termOccurrences(term: string, params?: PagedRequest): Promise<ApiListSuccess<TermOccurrence>> {
    return this.request<ApiListSuccess<TermOccurrence>>(
      `/universe/terms/${encodeURIComponent(term)}/occurrences${buildQuery(params)}`,
    );
  }

  async startReindex(): Promise<UniverseReindexStart> {
    const response = await this.request<ApiSuccess<UniverseReindexStart>>('/universe/reindex', {
      method: 'POST',
    });
    return response.data;
  }

  async reindexStatus(runId: string): Promise<UniverseIngestRun> {
    const response = await this.request<ApiSuccess<UniverseIngestRun>>(
      `/universe/reindex/${encodeURIComponent(runId)}`,
    );
    return response.data;
  }
}
