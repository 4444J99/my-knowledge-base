import type {
  TermOccurrence,
  UniverseChat,
  UniverseProvider,
  UniverseSummary,
  UniverseTurn,
} from '@knowledge-base/contracts';
import { DesktopUniverseClient } from './universe-client.js';

export type DesktopShellStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface DesktopExplorationSelection {
  providerId?: string;
  chatId?: string;
  term?: string;
}

export interface DesktopUniverseShellState {
  status: DesktopShellStatus;
  error?: string;
  summary: UniverseSummary | null;
  providers: UniverseProvider[];
  selectedProviderId: string;
  chats: UniverseChat[];
  selectedChatId: string;
  turns: UniverseTurn[];
  activeTerm: string;
  occurrences: TermOccurrence[];
  updatedAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function cloneState(state: DesktopUniverseShellState): DesktopUniverseShellState {
  return {
    ...state,
    providers: [...state.providers],
    chats: [...state.chats],
    turns: [...state.turns],
    occurrences: [...state.occurrences],
  };
}

export class DesktopUniverseShell {
  private state: DesktopUniverseShellState = {
    status: 'idle',
    summary: null,
    providers: [],
    selectedProviderId: '',
    chats: [],
    selectedChatId: '',
    turns: [],
    activeTerm: '',
    occurrences: [],
    updatedAt: nowIso(),
  };

  constructor(private readonly client: DesktopUniverseClient) {}

  snapshot(): DesktopUniverseShellState {
    return cloneState(this.state);
  }

  async initialize(): Promise<DesktopUniverseShellState> {
    this.transition({ status: 'loading', error: undefined });
    try {
      const [summaryResponse, providersResponse] = await Promise.all([
        this.client.summary(),
        this.client.providers({ limit: 100, offset: 0 }),
      ]);

      this.transition({
        summary: summaryResponse.data,
        providers: providersResponse.data,
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

  async selectProvider(providerId: string): Promise<DesktopUniverseShellState> {
    if (!providerId) {
      this.transition({
        selectedProviderId: '',
        chats: [],
        selectedChatId: '',
        turns: [],
      });
      return this.snapshot();
    }

    const chatsResponse = await this.client.providerChats(providerId, { limit: 500, offset: 0 });
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

  async selectChat(chatId: string): Promise<DesktopUniverseShellState> {
    if (!chatId) {
      this.transition({ selectedChatId: '', turns: [] });
      return this.snapshot();
    }

    const turnsResponse = await this.client.chatTurns(chatId, { limit: 1000, offset: 0 });
    this.transition({
      selectedChatId: chatId,
      turns: turnsResponse.data,
    });
    return this.snapshot();
  }

  async searchTerm(term: string): Promise<DesktopUniverseShellState> {
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

  async restore(selection: DesktopExplorationSelection): Promise<DesktopUniverseShellState> {
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

  private transition(patch: Partial<DesktopUniverseShellState>): void {
    this.state = {
      ...this.state,
      ...patch,
      updatedAt: nowIso(),
    };
  }
}
