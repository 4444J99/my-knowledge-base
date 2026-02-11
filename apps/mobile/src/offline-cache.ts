export interface SavedExploration {
  id: string;
  providerId?: string;
  chatId?: string;
  term?: string;
  label: string;
  savedAt: string;
}

export interface ExplorationStorage {
  load(): Promise<SavedExploration[]>;
  save(entries: SavedExploration[]): Promise<void>;
}

export interface AsyncKeyValueStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem?(key: string): Promise<void> | void;
}

export interface RecentExplorationCacheOptions {
  maxEntries?: number;
  storage?: ExplorationStorage;
}

function nowIso(): string {
  return new Date().toISOString();
}

function dedupe(entries: SavedExploration[]): SavedExploration[] {
  const seen = new Set<string>();
  const result: SavedExploration[] = [];
  for (const entry of entries) {
    const key = `${entry.providerId ?? ''}::${entry.chatId ?? ''}::${entry.term ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result;
}

function isSavedExploration(value: unknown): value is SavedExploration {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.label === 'string' &&
    typeof record.savedAt === 'string'
  );
}

export function createAsyncKeyValueExplorationStorage(
  storage: AsyncKeyValueStorage,
  key = 'knowledge-base:mobile:recent-explorations',
): ExplorationStorage {
  return {
    async load(): Promise<SavedExploration[]> {
      const raw = await storage.getItem(key);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(isSavedExploration);
      } catch {
        return [];
      }
    },
    async save(entries: SavedExploration[]): Promise<void> {
      await storage.setItem(key, JSON.stringify(entries));
    },
  };
}

export class RecentExplorationCache {
  private entries: SavedExploration[] = [];
  private readonly maxEntries: number;
  private readonly storage?: ExplorationStorage;

  constructor(options: RecentExplorationCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 25;
    this.storage = options.storage;
  }

  async hydrate(): Promise<SavedExploration[]> {
    if (!this.storage) return this.list();
    const loaded = await this.storage.load();
    this.entries = dedupe([...loaded]).slice(0, this.maxEntries);
    return this.list();
  }

  list(): SavedExploration[] {
    return [...this.entries];
  }

  async add(input: Omit<SavedExploration, 'id' | 'savedAt'>): Promise<SavedExploration> {
    const entry: SavedExploration = {
      ...input,
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
      savedAt: nowIso(),
    };

    this.entries = dedupe([entry, ...this.entries]).slice(0, this.maxEntries);
    if (this.storage) await this.storage.save(this.entries);
    return entry;
  }

  async remove(id: string): Promise<void> {
    this.entries = this.entries.filter((entry) => entry.id !== id);
    if (this.storage) await this.storage.save(this.entries);
  }

  async clear(): Promise<void> {
    this.entries = [];
    if (this.storage) await this.storage.save(this.entries);
  }
}
