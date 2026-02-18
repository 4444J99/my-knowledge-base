import type { AtomicUnit, BranchDirection, UnitBranchResponse } from '../types';
import { asApiResponse, buildParams, requestJson, unwrapData } from './core';

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
        typeof payload === 'object' && payload !== null && 'pagination' in payload
          ? {
              page: Number((payload as { pagination?: { page?: number } }).pagination?.page) || page,
              pageSize:
                Number((payload as { pagination?: { pageSize?: number } }).pagination?.pageSize) ||
                pageSize,
              total:
                Number((payload as { pagination?: { total?: number } }).pagination?.total) || wrapped.length,
              totalPages:
                Number((payload as { pagination?: { totalPages?: number } }).pagination?.totalPages) ||
                1,
            }
          : undefined;
      return asApiResponse(wrapped, pagination);
    }

    if (
      typeof payload === 'object' &&
      payload !== null &&
      'units' in payload &&
      Array.isArray((payload as { units?: unknown[] }).units)
    ) {
      return asApiResponse((payload as { units: AtomicUnit[] }).units);
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
