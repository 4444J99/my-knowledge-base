import { useMemo, useState } from 'react';
import pagesDirectoryData from '../../data/github-pages.json';

interface GitHubPagesRepo {
  owner: string;
  repo: string;
  fullName: string;
  repoUrl: string;
  pageUrl: string;
  status: string | null;
  buildType: string | null;
  cname: string | null;
  sourceBranch: string | null;
  sourcePath: string | null;
  updatedAt: string | null;
}

interface GitHubPagesDirectory {
  generatedAt: string;
  owners: string[];
  totalRepos: number;
  repos: GitHubPagesRepo[];
}

const pagesDirectory = pagesDirectoryData as GitHubPagesDirectory;

function formatDate(value: string | null) {
  if (!value) return 'n/a';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Date(timestamp).toLocaleString();
}

export function GitHubPagesTab() {
  const [query, setQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<'all' | string>('all');

  const ownerOrder = useMemo(
    () =>
      new Map(
        pagesDirectory.owners.map((owner, index) => [owner.toLowerCase(), index])
      ),
    []
  );

  const ownerOptions = useMemo(() => {
    const owners = new Set<string>(pagesDirectory.owners);
    for (const repo of pagesDirectory.repos) owners.add(repo.owner);
    return Array.from(owners).sort((a, b) => {
      const aOrder = ownerOrder.get(a.toLowerCase());
      const bOrder = ownerOrder.get(b.toLowerCase());
      if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
      if (aOrder !== undefined) return -1;
      if (bOrder !== undefined) return 1;
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });
  }, [ownerOrder]);

  const filteredRepos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return pagesDirectory.repos.filter((repo) => {
      if (ownerFilter !== 'all' && repo.owner !== ownerFilter) return false;

      if (!normalizedQuery) return true;

      const haystack = [repo.fullName, repo.owner, repo.repo, repo.repoUrl, repo.pageUrl]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [ownerFilter, query]);

  const groupedRepos = useMemo(() => {
    const grouped = new Map<string, GitHubPagesRepo[]>();

    for (const repo of filteredRepos) {
      if (!grouped.has(repo.owner)) grouped.set(repo.owner, []);
      grouped.get(repo.owner)?.push(repo);
    }

    return Array.from(grouped.entries()).sort((a, b) => {
      const aOrder = ownerOrder.get(a[0].toLowerCase());
      const bOrder = ownerOrder.get(b[0].toLowerCase());
      if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
      if (aOrder !== undefined) return -1;
      if (bOrder !== undefined) return 1;
      return a[0].localeCompare(b[0], undefined, { sensitivity: 'base' });
    });
  }, [filteredRepos, ownerOrder]);

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h3 className="text-lg font-semibold">GitHub Pages Directory</h3>
        <p className="text-sm text-[var(--ink-muted)] mt-2">
          Static index of Pages-enabled repositories across personal + organ organizations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          <div className="rounded-xl bg-[var(--bg)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">Total Repos</p>
            <p className="text-xl font-semibold">{pagesDirectory.totalRepos}</p>
          </div>
          <div className="rounded-xl bg-[var(--bg)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">Owners</p>
            <p className="text-xl font-semibold">{ownerOptions.length}</p>
          </div>
          <div className="rounded-xl bg-[var(--bg)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">Filtered</p>
            <p className="text-xl font-semibold">{filteredRepos.length}</p>
          </div>
          <div className="rounded-xl bg-[var(--bg)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">Last Sync</p>
            <p className="text-sm font-semibold">{formatDate(pagesDirectory.generatedAt)}</p>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-col md:flex-row gap-3">
          <label className="flex-1">
            <span className="text-sm text-[var(--ink-muted)] block mb-1">Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input w-full"
              placeholder="Filter by owner, repo, or URL"
            />
          </label>
          <label className="w-full md:w-64">
            <span className="text-sm text-[var(--ink-muted)] block mb-1">Owner</span>
            <select
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value)}
              className="input w-full"
            >
              <option value="all">All owners</option>
              {ownerOptions.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {groupedRepos.length === 0 ? (
        <section className="card p-6">
          <p className="text-sm text-[var(--ink-muted)]">
            No repositories match this filter.
          </p>
        </section>
      ) : (
        groupedRepos.map(([owner, repos]) => (
          <section key={owner} className="card p-6">
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <h4 className="text-base font-semibold">{owner}</h4>
              <span className="text-sm text-[var(--ink-muted)]">
                {repos.length} repo{repos.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3">
              {repos.map((repo) => (
                <article
                  key={repo.fullName}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={repo.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[var(--accent-3)] hover:underline"
                    >
                      {repo.fullName}
                    </a>
                    <a
                      href={repo.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
                    >
                      Repository
                    </a>
                    {repo.updatedAt && (
                      <span className="text-xs text-[var(--ink-muted)]">
                        updated {formatDate(repo.updatedAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3 text-xs">
                    {repo.status && (
                      <span className="px-2 py-1 rounded-full border border-[var(--border)]">
                        status: {repo.status}
                      </span>
                    )}
                    {repo.buildType && (
                      <span className="px-2 py-1 rounded-full border border-[var(--border)]">
                        build: {repo.buildType}
                      </span>
                    )}
                    {repo.cname && (
                      <span className="px-2 py-1 rounded-full border border-[var(--border)]">
                        cname: {repo.cname}
                      </span>
                    )}
                    {repo.sourceBranch && (
                      <span className="px-2 py-1 rounded-full border border-[var(--border)]">
                        source: {repo.sourceBranch}
                        {repo.sourcePath && repo.sourcePath !== '/' ? `:${repo.sourcePath}` : ''}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
