import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { federationApi } from '../../api/client';
import { useUIStore } from '../../stores/uiStore';
import type { FederatedScanJob, FederatedSearchHit, FederatedSource } from '../../types';

function splitPatterns(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function hasActiveJobs(jobs: FederatedScanJob[]): boolean {
  return jobs.some((job) => job.status === 'queued' || job.status === 'running');
}

export function FederationTab() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const [name, setName] = useState('');
  const [rootPath, setRootPath] = useState('');
  const [includePatterns, setIncludePatterns] = useState('**/*');
  const [excludePatterns, setExcludePatterns] = useState('');
  const [scanMode, setScanMode] = useState<'incremental' | 'full'>('incremental');
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSourceId, setSearchSourceId] = useState<string>('');
  const [searchMimeType, setSearchMimeType] = useState('');
  const [searchPathPrefix, setSearchPathPrefix] = useState('');
  const [searchResults, setSearchResults] = useState<FederatedSearchHit[]>([]);

  const sourcesQuery = useQuery({
    queryKey: ['federation-sources'],
    queryFn: () => federationApi.listSources(),
    staleTime: 15_000,
  });

  const sources = sourcesQuery.data?.data ?? [];

  useEffect(() => {
    if (!selectedSourceId && sources.length > 0) {
      setSelectedSourceId(sources[0].id);
    }
  }, [selectedSourceId, sources]);

  const jobsQuery = useQuery({
    queryKey: ['federation-jobs', selectedSourceId],
    queryFn: () => federationApi.listJobs({ sourceId: selectedSourceId, limit: 30 }),
    enabled: selectedSourceId.length > 0,
    staleTime: 1_000,
    refetchInterval: (query) => {
      const jobs = (query.state.data?.data ?? []) as FederatedScanJob[];
      return hasActiveJobs(jobs) ? 1_500 : false;
    },
  });

  const scansQuery = useQuery({
    queryKey: ['federation-scans', selectedSourceId],
    queryFn: () => federationApi.listScans(selectedSourceId),
    enabled: selectedSourceId.length > 0,
    staleTime: 5_000,
    refetchInterval: () => (hasActiveJobs(jobsQuery.data?.data ?? []) ? 1_500 : false),
  });

  const createSourceMutation = useMutation({
    mutationFn: () =>
      federationApi.createSource({
        name,
        rootPath,
        includePatterns: splitPatterns(includePatterns),
        excludePatterns: splitPatterns(excludePatterns),
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['federation-sources'] });
      addToast(`Source registered: ${response.data.name}`, 'success');
      setName('');
      setRootPath('');
      setIncludePatterns('**/*');
      setExcludePatterns('');
    },
    onError: (error: Error) => {
      addToast(error.message, 'error');
    },
  });

  const runScanMutation = useMutation({
    mutationFn: ({ sourceId, mode }: { sourceId: string; mode: 'incremental' | 'full' }) =>
      federationApi.scanSource(sourceId, mode),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['federation-jobs', response.data.sourceId] });
      queryClient.invalidateQueries({ queryKey: ['federation-sources'] });
      addToast(`Scan job queued (${response.data.mode})`, 'success');
    },
    onError: (error: Error) => {
      addToast(error.message, 'error');
    },
  });

  const cancelJobMutation = useMutation({
    mutationFn: (jobId: string) => federationApi.cancelJob(jobId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['federation-jobs', response.data.sourceId] });
      queryClient.invalidateQueries({ queryKey: ['federation-scans', response.data.sourceId] });
      queryClient.invalidateQueries({ queryKey: ['federation-sources'] });
      addToast('Scan job cancelled', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message, 'error');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ source }: { source: FederatedSource }) =>
      federationApi.updateSource(source.id, {
        status: source.status === 'active' ? 'disabled' : 'active',
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['federation-sources'] });
      addToast(`Source ${response.data.status === 'active' ? 'enabled' : 'disabled'}`, 'success');
    },
    onError: (error: Error) => {
      addToast(error.message, 'error');
    },
  });

  const searchMutation = useMutation({
    mutationFn: () =>
      federationApi.search(searchQuery, {
        sourceId: searchSourceId || undefined,
        mimeType: searchMimeType || undefined,
        pathPrefix: searchPathPrefix || undefined,
        limit: 25,
      }),
    onSuccess: (response) => {
      setSearchResults(response.data);
    },
    onError: (error: Error) => {
      addToast(error.message, 'error');
      setSearchResults([]);
    },
  });

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId),
    [selectedSourceId, sources]
  );

  const jobs = jobsQuery.data?.data ?? [];
  const scans = scansQuery.data?.data ?? [];
  const activeJobBySource = useMemo(() => {
    const map = new Map<string, FederatedScanJob>();
    for (const job of jobs) {
      if ((job.status === 'queued' || job.status === 'running') && !map.has(job.sourceId)) {
        map.set(job.sourceId, job);
      }
    }
    return map;
  }, [jobs]);

  const onCreateSource = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createSourceMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Register Federated Source</h3>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onCreateSource}>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-[var(--ink-muted)]">Name</span>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Local Engineering Docs"
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-[var(--ink-muted)]">Root Path</span>
            <input
              className="input"
              value={rootPath}
              onChange={(event) => setRootPath(event.target.value)}
              placeholder="/Users/4jp/Documents/notes"
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-[var(--ink-muted)]">Include Patterns</span>
            <input
              className="input"
              value={includePatterns}
              onChange={(event) => setIncludePatterns(event.target.value)}
              placeholder="**/*.md, **/*.txt"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-[var(--ink-muted)]">Exclude Patterns</span>
            <input
              className="input"
              value={excludePatterns}
              onChange={(event) => setExcludePatterns(event.target.value)}
              placeholder="**/node_modules/**, **/.git/**"
            />
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button className="btn-primary" disabled={createSourceMutation.isPending} type="submit">
              {createSourceMutation.isPending ? 'Registering...' : 'Register Source'}
            </button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Sources</h3>
          {sourcesQuery.isLoading && <span className="text-sm text-[var(--ink-muted)]">Loading...</span>}
        </div>

        {sources.length === 0 ? (
          <p className="text-[var(--ink-muted)]">No sources registered yet.</p>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => {
              const activeJob = activeJobBySource.get(source.id);

              return (
                <div
                  key={source.id}
                  className={`border border-[var(--border)] rounded-lg p-4 ${
                    selectedSourceId === source.id ? 'bg-[var(--surface)]' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      className="text-left"
                      onClick={() => setSelectedSourceId(source.id)}
                      type="button"
                    >
                      <p className="font-medium">{source.name}</p>
                      <p className="text-sm text-[var(--ink-muted)]">{source.rootPath}</p>
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`tag ${source.status === 'active' ? 'bg-emerald-700/20' : ''}`}>
                        {source.status}
                      </span>
                      {activeJob && <span className="tag bg-amber-700/20">job: {activeJob.status}</span>}
                      <select
                        className="input w-36"
                        value={scanMode}
                        onChange={(event) => setScanMode(event.target.value as 'incremental' | 'full')}
                        aria-label="Scan mode"
                      >
                        <option value="incremental">Incremental</option>
                        <option value="full">Full</option>
                      </select>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => runScanMutation.mutate({ sourceId: source.id, mode: scanMode })}
                        disabled={runScanMutation.isPending || source.status !== 'active'}
                      >
                        Queue Scan
                      </button>
                      {activeJob && (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => cancelJobMutation.mutate(activeJob.id)}
                          disabled={cancelJobMutation.isPending}
                        >
                          Cancel Job
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => toggleStatusMutation.mutate({ source })}
                        disabled={toggleStatusMutation.isPending}
                      >
                        {source.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Scan Jobs</h3>
        {!selectedSource ? (
          <p className="text-[var(--ink-muted)]">Select a source to view jobs.</p>
        ) : jobs.length === 0 ? (
          <p className="text-[var(--ink-muted)]">No scan jobs for this source yet.</p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between border border-[var(--border)] rounded p-3">
                <div>
                  <p className="font-medium">
                    {job.status} <span className="text-sm text-[var(--ink-muted)]">({job.mode})</span>
                  </p>
                  <p className="text-sm text-[var(--ink-muted)]">{job.id}</p>
                  {job.errorMessage && <p className="text-sm text-red-400">{job.errorMessage}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--ink-muted)]">{new Date(job.createdAt).toLocaleString()}</p>
                  {(job.status === 'queued' || job.status === 'running') && (
                    <button
                      type="button"
                      className="btn-ghost mt-1"
                      onClick={() => cancelJobMutation.mutate(job.id)}
                      disabled={cancelJobMutation.isPending}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Scan History</h3>
        {!selectedSource ? (
          <p className="text-[var(--ink-muted)]">Select a source to view scans.</p>
        ) : scans.length === 0 ? (
          <p className="text-[var(--ink-muted)]">No scan runs for this source yet.</p>
        ) : (
          <div className="space-y-2">
            {scans.map((scan) => (
              <div key={scan.id} className="flex items-center justify-between border border-[var(--border)] rounded p-3">
                <div>
                  <p className="font-medium">{scan.status}</p>
                  <p className="text-sm text-[var(--ink-muted)]">
                    scanned {scan.scannedCount} | indexed {scan.indexedCount} | skipped {scan.skippedCount}
                  </p>
                </div>
                <p className="text-sm text-[var(--ink-muted)]">{new Date(scan.startedAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Federated Search</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <input
            className="input md:col-span-2"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search indexed external documents"
          />
          <select
            className="input"
            value={searchSourceId}
            onChange={(event) => setSearchSourceId(event.target.value)}
          >
            <option value="">All Sources</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            value={searchMimeType}
            onChange={(event) => setSearchMimeType(event.target.value)}
            placeholder="mimeType (optional)"
          />
          <input
            className="input md:col-span-3"
            value={searchPathPrefix}
            onChange={(event) => setSearchPathPrefix(event.target.value)}
            placeholder="Path prefix filter (optional)"
          />
          <button
            type="button"
            className="btn-primary"
            onClick={() => searchMutation.mutate()}
            disabled={searchMutation.isPending || searchQuery.trim().length === 0}
          >
            {searchMutation.isPending ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searchResults.length === 0 ? (
          <p className="text-[var(--ink-muted)]">No federated search results yet.</p>
        ) : (
          <div className="space-y-3">
            {searchResults.map((result) => (
              <div key={result.id} className="border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="font-medium">{result.title}</p>
                  <span className="text-xs text-[var(--ink-muted)]">
                    {result.sourceName} • score {result.score}
                  </span>
                </div>
                <p className="text-xs text-[var(--ink-muted)] mb-2">{result.path}</p>
                <p className="text-sm text-[var(--ink)]">{result.snippet}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
