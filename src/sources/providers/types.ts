import type { ProviderId } from '@knowledge-base/contracts';

export interface NormalizedTurn {
  turnIndex: number;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface NormalizedConversation {
  provider: ProviderId;
  externalThreadId?: string;
  externalAccountId?: string;
  accountDisplayName?: string;
  accountEmail?: string;
  title: string;
  sourcePath: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
  turns: NormalizedTurn[];
}

export interface ProviderImporterContext {
  filePath: string;
  rawContent: string;
  parsedJson?: unknown;
}

export interface ProviderImporter {
  id: ProviderId;
  canParse(context: ProviderImporterContext): boolean;
  parse(context: ProviderImporterContext): NormalizedConversation[];
}
