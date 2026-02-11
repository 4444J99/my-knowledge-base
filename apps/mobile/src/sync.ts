export interface ProviderSyncCheckpoint {
  providerId: string;
  offset: number;
}

export interface SyncState {
  checkpoints: Record<string, number>;
  updatedAt: string;
}

export interface SyncPlanItem {
  providerId: string;
  limit: number;
  offset: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

export class ResumableSyncState {
  private state: SyncState;

  constructor(initialState?: SyncState) {
    this.state = initialState ?? {
      checkpoints: {},
      updatedAt: nowIso(),
    };
  }

  getCheckpoint(providerId: string): ProviderSyncCheckpoint {
    return {
      providerId,
      offset: this.state.checkpoints[providerId] ?? 0,
    };
  }

  markCompleted(providerId: string, nextOffset: number): void {
    this.state = {
      checkpoints: {
        ...this.state.checkpoints,
        [providerId]: Math.max(0, nextOffset),
      },
      updatedAt: nowIso(),
    };
  }

  export(): SyncState {
    return {
      checkpoints: { ...this.state.checkpoints },
      updatedAt: this.state.updatedAt,
    };
  }
}

export function buildSyncPlan(
  providerIds: string[],
  state: ResumableSyncState,
  pageSize = 50,
): SyncPlanItem[] {
  return providerIds.map((providerId) => ({
    providerId,
    limit: pageSize,
    offset: state.getCheckpoint(providerId).offset,
  }));
}

