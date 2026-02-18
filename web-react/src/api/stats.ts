import { asApiResponse, buildParams, normalizeStats, normalizeWordCloud, requestJson } from './core';

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
