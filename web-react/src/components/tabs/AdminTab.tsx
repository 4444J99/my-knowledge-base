/**
 * AdminTab Component
 * Admin dashboard with export, stats, and word cloud
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { statsApi, exportApi, unitsApi } from '../../api/client';
import { useSearchStore } from '../../stores/searchStore';
import { useUIStore } from '../../stores/uiStore';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export function AdminTab() {
  const { results } = useSearchStore();
  const { addToast } = useUIStore();
  const [exportSource, setExportSource] = useState<'results' | 'all'>('results');
  const [exportFormat, setExportFormat] = useState('json');
  const [wordCloudSource, setWordCloudSource] = useState('both');
  const [wordCloudLimit, setWordCloudLimit] = useState(100);

  // Fetch stats
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => statsApi.getDashboard(),
    staleTime: 60000,
  });

  // Fetch word cloud data
  const { data: wordCloudResponse, refetch: refetchWordCloud } = useQuery({
    queryKey: ['wordcloud', wordCloudSource, wordCloudLimit],
    queryFn: () => statsApi.getWordCloud({ source: wordCloudSource, limit: wordCloudLimit }),
    staleTime: 60000,
  });

  // Fetch export formats
  const { data: formatsResponse } = useQuery({
    queryKey: ['export-formats'],
    queryFn: () => exportApi.getFormats(),
    staleTime: 300000,
  });

  const stats = statsResponse?.data;
  const wordCloudData = wordCloudResponse?.data || [];
  const formats = formatsResponse?.data || [];

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      let unitsToExport = results.map((r) => r.unit);

      if (exportSource === 'all') {
        const response = await unitsApi.list({ limit: 1000 });
        unitsToExport = response.data;
      }

      if (unitsToExport.length === 0) {
        throw new Error('No units to export');
      }

      const response = await fetch(`/api/export/${exportFormat}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ units: unitsToExport }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${new Date().toISOString().slice(0, 10)}.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      addToast('Export completed successfully', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message, 'error');
    },
  });

  // Chart data for types
  const typeChartData = stats?.unitsByType ? {
    labels: Object.keys(stats.unitsByType),
    datasets: [{
      data: Object.values(stats.unitsByType),
      backgroundColor: ['#2a9d8f', '#e9c46a', '#f4a261', '#3a86ff', '#e76f51'],
    }],
  } : null;

  // Chart data for categories
  const categoryChartData = stats?.unitsByCategory ? {
    labels: Object.keys(stats.unitsByCategory),
    datasets: [{
      label: 'Units',
      data: Object.values(stats.unitsByCategory),
      backgroundColor: 'rgba(42, 157, 143, 0.7)',
    }],
  } : null;

  return (
    <div className="space-y-6">
      {/* Export Panel */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-4">Export Data</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[var(--ink-muted)]">Data Source</span>
            <select
              value={exportSource}
              onChange={(e) => setExportSource(e.target.value as 'results' | 'all')}
              className="input"
            >
              <option value="results">Current Search Results ({results.length})</option>
              <option value="all">All Units (max 1000)</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-[var(--ink-muted)]">Format</span>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="input"
            >
              {formats.map((format) => (
                <option key={format.name} value={format.name}>
                  {format.name.toUpperCase()} - {format.description}
                </option>
              ))}
              {formats.length === 0 && (
                <>
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="markdown">Markdown</option>
                  <option value="html">HTML (Styled)</option>
                  <option value="jsonld">JSON-LD</option>
                  <option value="ndjson">NDJSON</option>
                </>
              )}
            </select>
          </label>

          <button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="btn-primary"
          >
            {exportMutation.isPending ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      {/* Word Cloud */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-4">Knowledge Word Cloud</h3>
        <div className="flex flex-wrap gap-4 items-end mb-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[var(--ink-muted)]">Source</span>
            <select
              value={wordCloudSource}
              onChange={(e) => setWordCloudSource(e.target.value)}
              className="input"
            >
              <option value="both">Tags & Keywords</option>
              <option value="tags">Tags Only</option>
              <option value="keywords">Keywords Only</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-[var(--ink-muted)]">Limit</span>
            <select
              value={wordCloudLimit}
              onChange={(e) => setWordCloudLimit(parseInt(e.target.value))}
              className="input"
            >
              <option value="50">50 words</option>
              <option value="100">100 words</option>
              <option value="200">200 words</option>
            </select>
          </label>

          <button onClick={() => refetchWordCloud()} className="btn-ghost">
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2 p-4 bg-[var(--bg)] rounded-lg min-h-[200px]">
          {wordCloudData.map((word) => (
            <span
              key={word.text}
              className="tag cursor-default"
              style={{
                fontSize: `${Math.max(12, Math.min(32, word.size / 2))}px`,
                opacity: 0.5 + (word.size / 100) * 0.5,
              }}
            >
              {word.text}
            </span>
          ))}
          {wordCloudData.length === 0 && (
            <span className="text-[var(--ink-muted)]">Loading word cloud...</span>
          )}
        </div>
      </div>

      {/* Dashboard Stats */}
      {statsLoading ? (
        <div className="card p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-2)] border-t-transparent rounded-full mx-auto" />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Summary stats */}
          <div className="card p-4">
            <h3 className="text-lg font-semibold mb-4">Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-[var(--accent-2)]">
                  {stats.totalUnits.toLocaleString()}
                </p>
                <p className="text-sm text-[var(--ink-muted)]">Total Units</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[var(--accent)]">
                  {stats.totalConversations.toLocaleString()}
                </p>
                <p className="text-sm text-[var(--ink-muted)]">Conversations</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[var(--accent-3)]">
                  {stats.totalTags.toLocaleString()}
                </p>
                <p className="text-sm text-[var(--ink-muted)]">Tags</p>
              </div>
            </div>
          </div>

          {/* Type distribution */}
          {typeChartData && (
            <div className="card p-4">
              <h3 className="text-lg font-semibold mb-4">Units by Type</h3>
              <div className="h-64">
                <Pie data={typeChartData} options={{ maintainAspectRatio: false }} />
              </div>
            </div>
          )}

          {/* Category distribution */}
          {categoryChartData && (
            <div className="card p-4 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Units by Category</h3>
              <div className="h-64">
                <Bar
                  data={categoryChartData}
                  options={{
                    maintainAspectRatio: false,
                    scales: {
                      y: { beginAtZero: true },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* Recent units */}
          {stats.recentUnits && stats.recentUnits.length > 0 && (
            <div className="card p-4 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Recent Units</h3>
              <div className="space-y-2">
                {stats.recentUnits.slice(0, 5).map((unit) => (
                  <div
                    key={unit.id}
                    className="flex justify-between items-center p-2 bg-[var(--bg)] rounded"
                  >
                    <span className="font-medium truncate flex-1">{unit.title}</span>
                    <span className={`type-badge type-${unit.type} ml-2`}>
                      {unit.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
