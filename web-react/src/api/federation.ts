import type { FederatedScanJob, FederatedScanRun, FederatedSearchHit, FederatedSource } from '../types';
import { asApiResponse, buildParams, requestJson, unwrapData } from './core';

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
