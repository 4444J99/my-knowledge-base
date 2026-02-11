import type {
  ApiListSuccess,
  ApiSuccess,
  PagedRequest,
  TermOccurrence,
  UniverseChat,
  UniverseProvider,
  UniverseSummary,
  UniverseTurn,
} from '@knowledge-base/contracts';

export interface MobileUniverseClientConfig {
  baseUrl: string;
  authHeader?: string;
  fetchImpl?: typeof fetch;
}

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function makeHeaders(authHeader?: string): HeadersInit {
  if (!authHeader) return { 'Content-Type': 'application/json' };
  return {
    'Content-Type': 'application/json',
    Authorization: authHeader,
  };
}

function buildQuery(params?: PagedRequest): string {
  if (!params) return '';
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}

export class MobileUniverseClient {
  private readonly baseUrl: string;
  private readonly authHeader?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: MobileUniverseClientConfig) {
    this.baseUrl = trimTrailingSlashes(config.baseUrl);
    this.authHeader = config.authHeader;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private async request<T>(path: string): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: makeHeaders(this.authHeader),
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
}

export function createMobileUniverseClient(config: MobileUniverseClientConfig): MobileUniverseClient {
  return new MobileUniverseClient(config);
}

