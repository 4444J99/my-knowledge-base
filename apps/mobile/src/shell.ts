import type {
  TermOccurrence,
  UniverseChat,
  UniverseProvider,
  UniverseSummary,
  UniverseTurn,
} from '@knowledge-base/contracts';
import type { MobileUniverseClient } from './universe-client.js';
import { RecentExplorationCache, type SavedExploration } from './offline-cache.js';

export type MobileShellStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface MobileUniverseShellState {
  status: MobileShellStatus;
  error?: string;
  summary: UniverseSummary | null;
  providers: UniverseProvider[];
  selectedProviderId: string;
  chats: UniverseChat[];
  selectedChatId: string;
  turns: UniverseTurn[];
  activeTerm: string;
  occurrences: TermOccurrence[];
  savedExplorations: SavedExploration[];
  updatedAt: string;
}

export interface MobileRestoreSelection {
  providerId?: string;
  chatId?: string;
  term?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function cloneState(state: MobileUniverseShellState): MobileUniverseShellState {
  return {
    ...state,
    providers: [...state.providers],
    chats: [...state.chats],
    turns: [...state.turns],
    occurrences: [...state.occurrences],
    savedExplorations: [...state.savedExplorations],
  };
}

export class MobileUniverseShell {
  private state: MobileUniverseShellState = {
    status: 'idle',
    summary: null,
    providers: [],
    selectedProviderId: '',
    chats: [],
    selectedChatId: '',
    turns: [],
    activeTerm: '',
    occurrences: [],
    savedExplorations: [],
    updatedAt: nowIso(),
  };

  constructor(
    private readonly client: MobileUniverseClient,
    private readonly cache: RecentExplorationCache = new RecentExplorationCache(),
  ) {}

  snapshot(): MobileUniverseShellState {
    return cloneState(this.state);
  }

  async initialize(): Promise<MobileUniverseShellState> {
    this.transition({ status: 'loading', error: undefined });

    try {
      const [summaryResponse, providersResponse, saved] = await Promise.all([
        this.client.summary(),
        this.client.providers({ limit: 100, offset: 0 }),
        this.cache.hydrate(),
      ]);

      this.transition({
        summary: summaryResponse.data,
        providers: providersResponse.data,
        savedExplorations: saved,
        selectedProviderId: providersResponse.data[0]?.providerId ?? '',
      });

      if (this.state.selectedProviderId) {
        await this.selectProvider(this.state.selectedProviderId);
      }

      this.transition({ status: 'ready' });
      return this.snapshot();
    } catch (error) {
      this.transition({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      return this.snapshot();
    }
  }

  async selectProvider(providerId: string): Promise<MobileUniverseShellState> {
    if (!providerId) {
      this.transition({
        selectedProviderId: '',
        chats: [],
        selectedChatId: '',
        turns: [],
      });
      return this.snapshot();
    }

    const chatsResponse = await this.client.providerChats(providerId, { limit: 200, offset: 0 });
    const selectedChatId =
      chatsResponse.data.find((chat) => chat.id === this.state.selectedChatId)?.id ??
      chatsResponse.data[0]?.id ??
      '';

    this.transition({
      selectedProviderId: providerId,
      chats: chatsResponse.data,
      selectedChatId,
      turns: [],
    });

    if (selectedChatId) {
      await this.selectChat(selectedChatId);
    }

    return this.snapshot();
  }

  async selectChat(chatId: string): Promise<MobileUniverseShellState> {
    if (!chatId) {
      this.transition({ selectedChatId: '', turns: [] });
      return this.snapshot();
    }

    const turnsResponse = await this.client.chatTurns(chatId, { limit: 500, offset: 0 });
    this.transition({
      selectedChatId: chatId,
      turns: turnsResponse.data,
    });
    return this.snapshot();
  }

  async searchTerm(term: string): Promise<MobileUniverseShellState> {
    const normalized = term.trim().toLowerCase();
    if (!normalized) {
      this.transition({ activeTerm: '', occurrences: [] });
      return this.snapshot();
    }

    const hits = await this.client.termOccurrences(normalized, { limit: 500, offset: 0 });
    this.transition({
      activeTerm: normalized,
      occurrences: hits.data,
    });
    return this.snapshot();
  }

  async saveSelection(label: string): Promise<MobileUniverseShellState> {
    const normalizedLabel = label.trim() || this.deriveLabel();
    await this.cache.add({
      label: normalizedLabel,
      providerId: this.state.selectedProviderId || undefined,
      chatId: this.state.selectedChatId || undefined,
      term: this.state.activeTerm || undefined,
    });
    const savedExplorations = this.cache.list();
    this.transition({ savedExplorations });
    return this.snapshot();
  }

  async restore(selection: MobileRestoreSelection): Promise<MobileUniverseShellState> {
    if (selection.providerId) {
      await this.selectProvider(selection.providerId);
    }
    if (selection.chatId) {
      await this.selectChat(selection.chatId);
    }
    if (selection.term) {
      await this.searchTerm(selection.term);
    }
    return this.snapshot();
  }

  async removeSaved(id: string): Promise<MobileUniverseShellState> {
    await this.cache.remove(id);
    this.transition({ savedExplorations: this.cache.list() });
    return this.snapshot();
  }

  private deriveLabel(): string {
    const provider =
      this.state.providers.find((entry) => entry.providerId === this.state.selectedProviderId)?.displayName ??
      this.state.selectedProviderId;
    const chat = this.state.chats.find((entry) => entry.id === this.state.selectedChatId)?.title;
    if (this.state.activeTerm) {
      return `${provider}: ${this.state.activeTerm}`;
    }
    return `${provider}: ${chat || 'overview'}`;
  }

  private transition(patch: Partial<MobileUniverseShellState>): void {
    this.state = {
      ...this.state,
      ...patch,
      updatedAt: nowIso(),
    };
  }
}
