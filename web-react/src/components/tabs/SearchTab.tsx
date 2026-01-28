/**
 * SearchTab Component
 * Displays search results
 */

import { useSearchStore } from '../../stores/searchStore';
import { SearchResultCard } from '../UnitCard';

export function SearchTab() {
  const { results, total, loading, error, query, mode } = useSearchStore();

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-2)] border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-[var(--ink-muted)]">Searching...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--accent)]">Error: {error}</p>
      </div>
    );
  }

  if (!query) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--ink-muted)]">
          Enter a search query to find knowledge units.
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--ink-muted)]">
          No results found for "{query}".
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Results summary */}
      <div className="mb-4 text-sm text-[var(--ink-muted)]">
        Found <strong>{total}</strong> results for "{query}" using{' '}
        <strong>{mode}</strong> search
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((result) => (
          <SearchResultCard key={result.unit.id} result={result} />
        ))}
      </div>
    </div>
  );
}
