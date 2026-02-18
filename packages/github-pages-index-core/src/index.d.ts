export const SYNC_CORE_VERSION: string;
export const GITHUB_PAGES_SCHEMA_VERSION: string;
export const DEFAULT_OWNERS: string[];

export interface SyncGitHubPagesDirectoryOptions {
  owners: string[];
  outputPath: string;
  strict?: boolean;
  curationPath?: string | null;
  probeTimeoutMs?: number;
  retryAttempts?: number;
  repoConcurrency?: number;
  pagesConcurrency?: number;
  probeConcurrency?: number;
  logger?: {
    error?: (...args: unknown[]) => void;
    warn?: (...args: unknown[]) => void;
    log?: (...args: unknown[]) => void;
    info?: (...args: unknown[]) => void;
  };
}

export interface SyncGitHubPagesDirectoryResult {
  ok: boolean;
  usedFallback: boolean;
  errors: string[];
  totalRepos?: number;
  outputPath?: string;
}

export function syncGitHubPagesDirectory(
  options: SyncGitHubPagesDirectoryOptions
): Promise<SyncGitHubPagesDirectoryResult>;

export interface GitHubPagesValidationSummary {
  totalRepos: number;
  builtCount: number;
  erroredCount: number;
  unreachableCount: number;
  recentlyChangedCount: number;
  stale: boolean;
  ageHours: number | null;
  maxAgeHours: number;
  maxErrored: number;
  maxUnreachable: number;
}

export interface GitHubPagesValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  summary: GitHubPagesValidationSummary | null;
}

export function validateGitHubPagesIndex(options: {
  inputPath: string;
  maxAgeHours?: number;
  maxErrored?: number;
  maxUnreachable?: number;
}): GitHubPagesValidationResult;

export interface GitHubPagesTelemetry {
  generatedAt: string;
  sourcePath: string;
  indexGeneratedAt: string | null;
  syncStatus: string;
  totals: {
    repos: number;
    built: number;
    errored: number;
    unreachable: number;
  };
  thresholds: {
    maxAgeHours: number;
    maxErrored: number;
    maxUnreachable: number;
  };
  budgetStatus: {
    stale: boolean;
    erroredExceeded: boolean;
    unreachableExceeded: boolean;
  };
  ageHours: number | null;
}

export function parseGitHubPagesIndex(inputPath: string): {
  payload: Record<string, unknown>;
  repos: Record<string, unknown>[];
  generatedAtMs: number | null;
  generatedAtIso: string | null;
  syncStatus: string;
  totalRepos: number;
  builtCount: number;
  erroredCount: number;
  unreachableCount: number;
};

export function buildGitHubPagesTelemetry(options: {
  inputPath: string;
  maxAgeHours?: number;
  maxErrored?: number;
  maxUnreachable?: number;
}): GitHubPagesTelemetry;
