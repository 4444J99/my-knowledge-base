import type {
  ApiListSuccess,
  ApiSuccess,
  UniverseIngestRun,
  UniverseReindexStart,
} from '@knowledge-base/contracts';
import type {
  UniverseChat,
  UniverseNetworkEdge,
  UniverseProvider,
  UniverseSummary,
  UniverseTermOccurrence,
  UniverseTurn,
} from '../types';
import { buildParams, requestJson } from './core';

export const universeApi = {
  summary: async (): Promise<ApiSuccess<UniverseSummary>> =>
    (await requestJson('/universe/summary')) as ApiSuccess<UniverseSummary>,

  providers: async (params?: { limit?: number; offset?: number }): Promise<ApiListSuccess<UniverseProvider>> =>
    (await requestJson(`/universe/providers${buildParams(params)}`)) as ApiListSuccess<UniverseProvider>,

  providerChats: async (
    providerId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<ApiListSuccess<UniverseChat>> =>
    (await requestJson(
      `/universe/providers/${encodeURIComponent(providerId)}/chats${buildParams(params)}`
    )) as ApiListSuccess<UniverseChat>,

  chat: async (chatId: string): Promise<ApiSuccess<UniverseChat>> =>
    (await requestJson(`/universe/chats/${encodeURIComponent(chatId)}`)) as ApiSuccess<UniverseChat>,

  chatTurns: async (
    chatId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<ApiListSuccess<UniverseTurn>> =>
    (await requestJson(
      `/universe/chats/${encodeURIComponent(chatId)}/turns${buildParams(params)}`
    )) as ApiListSuccess<UniverseTurn>,

  chatNetwork: async (chatId: string, params?: { limit?: number }): Promise<ApiSuccess<UniverseNetworkEdge[]>> =>
    (await requestJson(
      `/universe/chats/${encodeURIComponent(chatId)}/network${buildParams(params)}`
    )) as ApiSuccess<UniverseNetworkEdge[]>,

  termOccurrences: async (
    term: string,
    params?: { limit?: number; offset?: number }
  ): Promise<ApiListSuccess<UniverseTermOccurrence>> =>
    (await requestJson(
      `/universe/terms/${encodeURIComponent(term)}/occurrences${buildParams(params)}`
    )) as ApiListSuccess<UniverseTermOccurrence>,

  parallelNetworks: async (params?: {
    limit?: number;
    minWeight?: number;
  }): Promise<ApiSuccess<UniverseNetworkEdge[]>> =>
    (await requestJson(`/universe/networks/parallel${buildParams(params)}`)) as ApiSuccess<
      UniverseNetworkEdge[]
    >,

  reindex: async (): Promise<ApiSuccess<UniverseReindexStart>> =>
    (await requestJson('/universe/reindex', { method: 'POST' })) as ApiSuccess<UniverseReindexStart>,

  reindexStatus: async (runId: string): Promise<ApiSuccess<UniverseIngestRun>> =>
    (await requestJson(`/universe/reindex/${encodeURIComponent(runId)}`)) as ApiSuccess<UniverseIngestRun>,
};
