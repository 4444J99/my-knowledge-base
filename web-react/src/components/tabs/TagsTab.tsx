/**
 * TagsTab Component
 * Browse and manage tags
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tagsApi } from '../../api/client';
import { useUIStore } from '../../stores/uiStore';

export function TagsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const { openModal } = useUIStore();

  // Fetch all tags
  const { data: tagsResponse, isLoading: tagsLoading, refetch } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.list(),
    staleTime: 60000,
  });

  // Fetch units for selected tag
  const { data: unitsResponse, isLoading: unitsLoading } = useQuery({
    queryKey: ['tagUnits', selectedTag],
    queryFn: () => tagsApi.getUnits(selectedTag!),
    enabled: !!selectedTag,
    staleTime: 60000,
  });

  const tags = tagsResponse?.data || [];
  const units = unitsResponse?.data || [];

  // Filter tags by search term
  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort tags by count (descending)
  const sortedTags = [...filteredTags].sort((a, b) => b.count - a.count);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Tags list */}
      <div className="lg:col-span-1">
        <div className="card p-4">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tags..."
              className="input flex-1"
            />
            <button onClick={() => refetch()} className="btn-ghost">
              Refresh
            </button>
          </div>

          {tagsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-2)] border-t-transparent rounded-full mx-auto" />
            </div>
          ) : sortedTags.length === 0 ? (
            <p className="text-center text-[var(--ink-muted)] py-8">
              {searchTerm ? 'No tags match your search' : 'No tags found'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-[60vh] overflow-auto">
              {sortedTags.map((tag) => (
                <button
                  key={tag.name}
                  onClick={() => setSelectedTag(tag.name)}
                  className={`tag cursor-pointer transition-all hover:scale-105 ${
                    selectedTag === tag.name
                      ? 'ring-2 ring-[var(--accent-2)]'
                      : ''
                  }`}
                  style={{
                    fontSize: `${Math.max(12, Math.min(20, 12 + Math.log(tag.count) * 3))}px`,
                  }}
                >
                  {tag.name}
                  <span className="ml-1 text-xs opacity-70">({tag.count})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Units for selected tag */}
      <div className="lg:col-span-2">
        {selectedTag ? (
          <div className="card p-4">
            <h3 className="text-lg font-semibold mb-4">
              Units tagged with "{selectedTag}"
            </h3>

            {unitsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-2)] border-t-transparent rounded-full mx-auto" />
              </div>
            ) : units.length === 0 ? (
              <p className="text-center text-[var(--ink-muted)] py-8">
                No units found with this tag
              </p>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-auto">
                {units.map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => openModal(unit.id)}
                    className="w-full text-left p-3 bg-[var(--bg)] rounded-lg hover:bg-[var(--border)] transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">{unit.title}</span>
                      <span className={`type-badge type-${unit.type}`}>
                        {unit.type}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--ink-muted)] line-clamp-2">
                      {unit.content.slice(0, 150)}
                      {unit.content.length > 150 ? '...' : ''}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="card p-8 text-center text-[var(--ink-muted)]">
            Select a tag to view associated units
          </div>
        )}
      </div>
    </div>
  );
}
