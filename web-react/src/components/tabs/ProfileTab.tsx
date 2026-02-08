/**
 * ProfileTab Component
 * User profile and workspace preferences summary.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../../api/client';
import { usePreferencesStore } from '../../stores/preferencesStore';
import { useUIStore } from '../../stores/uiStore';

interface LocalProfile {
  name: string;
  email: string;
  role: string;
}

const PROFILE_STORAGE_KEY = 'kb-profile';

function loadProfile(): LocalProfile {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!stored) {
      return { name: 'Knowledge Operator', email: '', role: 'Owner' };
    }
    const parsed = JSON.parse(stored) as LocalProfile;
    return {
      name: parsed.name || 'Knowledge Operator',
      email: parsed.email || '',
      role: parsed.role || 'Owner',
    };
  } catch {
    return { name: 'Knowledge Operator', email: '', role: 'Owner' };
  }
}

function saveProfile(profile: LocalProfile) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function ProfileTab() {
  const [profile, setProfile] = useState<LocalProfile>(loadProfile);
  const { theme } = useUIStore();
  const {
    defaultSearchMode,
    defaultResultsLimit,
    defaultFtsWeight,
    defaultSemanticWeight,
    compactView,
    showScores,
    defaultExportFormat,
  } = usePreferencesStore();

  const { data: statsResponse } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => statsApi.getDashboard(),
    staleTime: 60000,
  });

  const stats = statsResponse?.data;

  const preferenceSummary = useMemo(
    () => [
      `Theme: ${theme}`,
      `Search mode: ${defaultSearchMode}`,
      `Results limit: ${defaultResultsLimit}`,
      `Hybrid weights: FTS ${defaultFtsWeight.toFixed(1)} / Semantic ${defaultSemanticWeight.toFixed(1)}`,
      `Compact view: ${compactView ? 'on' : 'off'}`,
      `Score display: ${showScores ? 'on' : 'off'}`,
      `Default export: ${defaultExportFormat}`,
    ],
    [
      theme,
      defaultSearchMode,
      defaultResultsLimit,
      defaultFtsWeight,
      defaultSemanticWeight,
      compactView,
      showScores,
      defaultExportFormat,
    ]
  );

  const updateProfile = (field: keyof LocalProfile, value: string) => {
    const next = { ...profile, [field]: value };
    setProfile(next);
    saveProfile(next);
  };

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-[var(--ink-muted)]">Display Name</span>
            <input
              type="text"
              value={profile.name}
              onChange={(event) => updateProfile('name', event.target.value)}
              className="input"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-[var(--ink-muted)]">Email</span>
            <input
              type="email"
              value={profile.email}
              onChange={(event) => updateProfile('email', event.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm text-[var(--ink-muted)]">Role</span>
            <input
              type="text"
              value={profile.role}
              onChange={(event) => updateProfile('role', event.target.value)}
              className="input"
            />
          </label>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Workspace Snapshot</h3>
        {stats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-[var(--bg)] p-4">
              <p className="text-sm text-[var(--ink-muted)]">Units</p>
              <p className="text-2xl font-semibold">{stats.totalUnits.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-[var(--bg)] p-4">
              <p className="text-sm text-[var(--ink-muted)]">Conversations</p>
              <p className="text-2xl font-semibold">{stats.totalConversations.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-[var(--bg)] p-4">
              <p className="text-sm text-[var(--ink-muted)]">Tags</p>
              <p className="text-2xl font-semibold">{stats.totalTags.toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--ink-muted)]">Loading workspace metrics...</p>
        )}
      </section>

      <section className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Preference Summary</h3>
        <ul className="space-y-2">
          {preferenceSummary.map((line) => (
            <li key={line} className="text-sm text-[var(--ink-muted)]">
              {line}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
