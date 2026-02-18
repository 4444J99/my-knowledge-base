import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchApi, unitsApi } from './client';

function mockResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('web api client normalization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes hybrid results from wrapped response payloads', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({
        success: true,
        data: [
          {
            unit: {
              id: 'unit-1',
              type: 'insight',
              title: 'Wrapped',
              content: 'wrapped result',
            },
            score: 0.8,
          },
          {
            id: 'unit-2',
            type: 'code',
            title: 'Plain',
            content: 'plain result',
          },
        ],
      })
    );

    const response = await searchApi.hybrid('wrapped');
    expect(response.success).toBe(true);
    expect(response.data).toHaveLength(2);
    expect(response.data[0].unit.id).toBe('unit-1');
    expect(response.data[0].score).toBe(0.8);
    expect(response.data[1].unit.id).toBe('unit-2');
    expect(response.data[1].score).toBe(1);
  });

  it('normalizes suggestion payloads from object responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({
        success: true,
        data: [{ text: 'react' }, { text: 'redux' }],
      })
    );

    const response = await searchApi.suggestions('re');
    expect(response.data).toEqual(['react', 'redux']);
  });

  it('returns empty related-units payload when backend request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({ error: 'bad request' }, 500, 'Internal Server Error')
    );

    const response = await unitsApi.getRelated('unit-1');
    expect(response.success).toBe(true);
    expect(response.data).toEqual([]);
  });
});
