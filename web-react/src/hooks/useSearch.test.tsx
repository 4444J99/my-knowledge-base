// @vitest-environment jsdom

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchMode, SearchResult } from '../types';

const mocks = vi.hoisted(() => {
  const addToast = vi.fn();
  const setResults = vi.fn();
  const setTotal = vi.fn();
  const setLoading = vi.fn();
  const setError = vi.fn();

  const searchState = {
    query: 'q',
    mode: 'hybrid' as SearchMode,
    ftsWeight: 0.4,
    semanticWeight: 0.6,
    filters: {
      type: 'all',
      category: 'all',
      source: 'all',
      format: 'all',
      tag: '',
      minScore: 0.2,
      sort: 'relevance',
      limit: 20,
    },
    setResults,
    setTotal,
    setLoading,
    setError,
  };

  const reset = () => {
    addToast.mockReset();
    setResults.mockReset();
    setTotal.mockReset();
    setLoading.mockReset();
    setError.mockReset();
    searchState.query = 'q';
    searchState.mode = 'hybrid';
    searchState.ftsWeight = 0.4;
    searchState.semanticWeight = 0.6;
    searchState.filters = {
      type: 'all',
      category: 'all',
      source: 'all',
      format: 'all',
      tag: '',
      minScore: 0.2,
      sort: 'relevance',
      limit: 20,
    };
  };

  return { addToast, searchState, setError, setLoading, setResults, setTotal, reset };
});

vi.mock('../api/search', () => ({
  searchApi: {
    fts: vi.fn(),
    semantic: vi.fn(),
    hybrid: vi.fn(),
    suggestions: vi.fn(),
    facets: vi.fn(),
  },
}));

vi.mock('../stores/searchStore', () => ({
  useSearchStore: () => mocks.searchState,
}));

vi.mock('../stores/uiStore', () => ({
  useUIStore: () => ({
    addToast: mocks.addToast,
  }),
}));

import { searchApi } from '../api/search';
import { useSearch } from './useSearch';

function buildWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return Wrapper;
}

function asTimestamped<T>(data: T) {
  return {
    success: true as const,
    data,
    timestamp: new Date().toISOString(),
  };
}

describe('useSearch', () => {
  beforeEach(() => {
    mocks.reset();
    vi.mocked(searchApi.facets).mockResolvedValue(asTimestamped([]));
    vi.mocked(searchApi.suggestions).mockResolvedValue(asTimestamped([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('executes hybrid search and surfaces normalized results', async () => {
    const normalizedResults: SearchResult[] = [
      {
        unit: {
          id: 'unit-1',
          title: 'Unit One',
          content: 'normalized',
          type: 'insight',
          category: 'programming',
          tags: [],
          keywords: [],
          timestamp: new Date().toISOString(),
        },
        score: 0.91,
      },
    ];

    vi.mocked(searchApi.hybrid).mockResolvedValue(asTimestamped(normalizedResults));

    const { result } = renderHook(() => useSearch(), {
      wrapper: buildWrapper(),
    });

    act(() => {
      result.current.executeSearch();
    });

    await waitFor(() => {
      expect(searchApi.hybrid).toHaveBeenCalledWith(
        'q',
        expect.objectContaining({
          ftsWeight: 0.4,
          semanticWeight: 0.6,
        })
      );
    });

    await waitFor(() => {
      expect(result.current.searchResults).toEqual(normalizedResults);
      expect(result.current.searchTotal).toBe(1);
    });

    expect(mocks.setResults).toHaveBeenCalledWith(normalizedResults);
    expect(mocks.setTotal).toHaveBeenCalledWith(1);
    expect(mocks.setError).toHaveBeenCalledWith(null);
    expect(mocks.addToast).not.toHaveBeenCalled();
  });

  it('sets error state and toast when search request fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(searchApi.hybrid).mockRejectedValue(new Error('semantic backend unavailable'));

    const { result } = renderHook(() => useSearch(), {
      wrapper: buildWrapper(),
    });

    act(() => {
      result.current.executeSearch();
    });

    await waitFor(() => {
      expect(mocks.setError).toHaveBeenCalledWith('semantic backend unavailable');
    });

    expect(mocks.addToast).toHaveBeenCalledWith('semantic backend unavailable', 'error');
    expect(mocks.setLoading).toHaveBeenCalledWith(true);
    expect(mocks.setLoading).toHaveBeenLastCalledWith(false);
    expect(result.current.searchError).toBeTruthy();
    consoleErrorSpy.mockRestore();
  });
});
