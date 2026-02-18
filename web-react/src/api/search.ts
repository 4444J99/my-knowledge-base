import {
  asApiResponse,
  buildParams,
  normalizeSearchFacets,
  normalizeSearchResults,
  normalizeSuggestions,
  requestJson,
} from './core';

export const searchApi = {
  fts: async (query: string, params?: Record<string, string | number>) => {
    const payload = await requestJson(`/search/fts${buildParams({ q: query, ...params })}`);
    const results = normalizeSearchResults(payload);
    return asApiResponse(results);
  },

  semantic: async (query: string, params?: Record<string, string | number>) => {
    const payload = await requestJson(`/search/semantic${buildParams({ q: query, ...params })}`);
    const results = normalizeSearchResults(payload);
    return asApiResponse(results);
  },

  hybrid: async (query: string, params?: Record<string, string | number>) => {
    const payload = await requestJson(`/search/hybrid${buildParams({ q: query, ...params })}`);
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
