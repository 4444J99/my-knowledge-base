export interface LocalAttachPoint {
  id: string;
  label: string;
  absolutePath: string;
  includePatterns: string[];
  excludePatterns: string[];
}

export interface ReindexWorkflowState {
  runId?: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  updatedAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createAttachPoint(input: {
  label: string;
  absolutePath: string;
  includePatterns?: string[];
  excludePatterns?: string[];
}): LocalAttachPoint {
  const idSeed = `${input.label}-${input.absolutePath}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    id: idSeed.replace(/^-+|-+$/g, ''),
    label: input.label.trim() || 'Local Source',
    absolutePath: input.absolutePath,
    includePatterns: input.includePatterns ?? ['**/*.{json,md,txt,html}'],
    excludePatterns: input.excludePatterns ?? ['**/.git/**', '**/node_modules/**'],
  };
}

export function startReindexWorkflow(runId: string): ReindexWorkflowState {
  const now = nowIso();
  return {
    runId,
    status: 'running',
    startedAt: now,
    updatedAt: now,
  };
}

export function advanceReindexWorkflow(
  state: ReindexWorkflowState,
  status: 'running' | 'completed' | 'failed',
): ReindexWorkflowState {
  return {
    ...state,
    status,
    updatedAt: nowIso(),
  };
}

