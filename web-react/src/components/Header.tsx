/**
 * Header Component
 * Page header with title, stats, and theme toggle
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '../stores/uiStore';
import { statsApi } from '../api/client';

export function Header() {
  const { theme, setTheme, toggleShortcuts } = useUIStore();

  // Fetch stats
  const { data: statsResponse } = useQuery({
    queryKey: ['stats'],
    queryFn: () => statsApi.getDashboard(),
    staleTime: 60000, // 1 minute
  });

  const stats = statsResponse?.data;

  // Apply theme on mount
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme !== 'system') {
      root.classList.add(theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="mb-8">
      {/* Theme and shortcuts buttons */}
      <div className="fixed top-4 right-4 flex gap-2 z-40">
        <button
          onClick={toggleTheme}
          title="Toggle dark mode (T)"
          className="btn-ghost w-10 h-10 flex items-center justify-center text-lg"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button
          onClick={toggleShortcuts}
          title="Keyboard shortcuts (?)"
          className="btn-ghost w-10 h-10 flex items-center justify-center"
        >
          ⌨
        </button>
      </div>

      {/* Title block */}
      <div className="text-center mb-6">
        <span className="text-sm uppercase tracking-wider text-[var(--ink-muted)]">
          Knowledge Base
        </span>
        <h1 className="text-3xl font-bold text-[var(--accent-3)] mt-1">
          🧠 Knowledge Base Explorer
        </h1>
        <p className="text-[var(--ink-muted)] mt-2">
          Search, map, and browse your knowledge artifacts from one workspace.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="flex justify-center gap-6 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--accent-2)]" />
            <strong>{stats.totalUnits.toLocaleString()}</strong> units
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--accent)]" />
            <strong>{stats.totalConversations.toLocaleString()}</strong> conversations
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--accent-3)]" />
            <strong>{stats.totalTags.toLocaleString()}</strong> tags
          </span>
        </div>
      )}
    </header>
  );
}
