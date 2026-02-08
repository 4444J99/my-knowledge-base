/**
 * ExportsTab Component
 * Dedicated export workflows for result set or full dataset.
 */

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { exportApi, unitsApi } from '../../api/client';
import { useSearchStore } from '../../stores/searchStore';
import { usePreferencesStore } from '../../stores/preferencesStore';
import { useUIStore } from '../../stores/uiStore';

type ExportSource = 'results' | 'all';

export function ExportsTab() {
  const [source, setSource] = useState<ExportSource>('results');
  const [format, setFormat] = useState('json');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [recentExports, setRecentExports] = useState<string[]>([]);
  const { results } = useSearchStore();
  const { defaultExportFormat } = usePreferencesStore();
  const { addToast } = useUIStore();

  const { data: formatsResponse } = useQuery({
    queryKey: ['export-formats'],
    queryFn: () => exportApi.getFormats(),
    staleTime: 300000,
  });

  const formats = formatsResponse?.data ?? [];

  const exportMutation = useMutation({
    mutationFn: async () => {
      let unitsToExport = results.map((item) => item.unit);
      if (source === 'all') {
        const response = await unitsApi.list({ limit: 1000 });
        unitsToExport = response.data;
      }

      if (unitsToExport.length === 0) {
        throw new Error('No units available for export.');
      }

      const response = await fetch(`/api/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          units: unitsToExport,
          options: {
            includeMetadata,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Export failed (${response.status})`);
      }

      const blob = await response.blob();
      const extension = formats.find((f) => f.name === format)?.extension ?? format;
      const filename = `knowledge-export-${new Date().toISOString().slice(0, 10)}.${extension}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      return filename;
    },
    onSuccess: (filename) => {
      setRecentExports((prev) => [filename, ...prev].slice(0, 5));
      addToast('Export completed.', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message, 'error');
    },
  });

  const selectedFormatDescription =
    formats.find((item) => item.name === format)?.description ?? 'Structured export format';

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Export Workspace</h3>
        <p className="text-sm text-[var(--ink-muted)] mb-6">
          Create snapshots of your current knowledge view for backups, reports, or sharing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-[var(--ink-muted)]">Source</span>
            <select
              value={source}
              onChange={(event) => setSource(event.target.value as ExportSource)}
              className="input"
            >
              <option value="results">Current search results ({results.length})</option>
              <option value="all">All units (up to 1000)</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-[var(--ink-muted)]">Format</span>
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value)}
              className="input"
            >
              {formats.length > 0 ? (
                formats.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name.toUpperCase()}
                  </option>
                ))
              ) : (
                <>
                  <option value={defaultExportFormat}>{defaultExportFormat.toUpperCase()}</option>
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="markdown">MARKDOWN</option>
                  <option value="html">HTML</option>
                </>
              )}
            </select>
          </label>
        </div>

        <label className="flex items-center gap-3 mt-4">
          <input
            type="checkbox"
            checked={includeMetadata}
            onChange={(event) => setIncludeMetadata(event.target.checked)}
            className="accent-[var(--accent-2)]"
          />
          <span className="text-sm">Include metadata and tags</span>
        </label>

        <p className="text-sm text-[var(--ink-muted)] mt-4">
          {selectedFormatDescription}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="btn-primary"
          >
            {exportMutation.isPending ? 'Exporting...' : 'Start Export'}
          </button>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Exports</h3>
        {recentExports.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">No exports yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentExports.map((item) => (
              <li key={item} className="text-sm text-[var(--ink-muted)]">
                {item}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
