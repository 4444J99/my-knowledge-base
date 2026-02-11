import { NormalizedConversation, ProviderImporter, ProviderImporterContext } from './types.js';
import { extractText, mapRole, parseRoleTaggedTranscript, stableTitle, toIsoDate } from './utils.js';

interface CopilotTurn {
  role?: string;
  author?: string;
  sender?: string;
  prompt?: unknown;
  response?: unknown;
  content?: unknown;
  text?: string;
  timestamp?: string | number;
  created_at?: string;
}

interface CopilotConversation {
  id?: string;
  threadId?: string;
  title?: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  messages?: CopilotTurn[];
  turns?: CopilotTurn[];
  exchanges?: CopilotTurn[];
}

function toConversations(input: unknown): CopilotConversation[] {
  if (Array.isArray(input)) {
    return input.filter((item): item is CopilotConversation => !!item && typeof item === 'object');
  }

  if (!input || typeof input !== 'object') return [];
  const record = input as Record<string, unknown>;

  if (Array.isArray(record.conversations)) {
    return record.conversations.filter((item): item is CopilotConversation => !!item && typeof item === 'object');
  }

  if (Array.isArray(record.messages) || Array.isArray(record.turns) || Array.isArray(record.exchanges)) {
    return [record as unknown as CopilotConversation];
  }

  return [];
}

export class CopilotImporter implements ProviderImporter {
  id = 'copilot' as const;

  canParse(context: ProviderImporterContext): boolean {
    const path = context.filePath.toLowerCase();
    if (path.includes('copilot') || path.includes('github')) return true;

    const parsed = context.parsedJson;
    const items = toConversations(parsed);
    return items.some((item) => Array.isArray(item.messages) || Array.isArray(item.exchanges));
  }

  parse(context: ProviderImporterContext): NormalizedConversation[] {
    const items = toConversations(context.parsedJson);
    const conversations: NormalizedConversation[] = [];

    for (const item of items) {
      const rawTurns = Array.isArray(item.messages)
        ? item.messages
        : Array.isArray(item.turns)
        ? item.turns
        : Array.isArray(item.exchanges)
        ? item.exchanges
        : [];

      const turns = rawTurns
        .flatMap((rawTurn, index) => {
          const directContent = extractText(rawTurn.content ?? rawTurn.text ?? '');
          if (directContent) {
            return [{
              turnIndex: index,
              role: mapRole(rawTurn.role ?? rawTurn.author ?? rawTurn.sender),
              content: directContent,
              timestamp: toIsoDate(rawTurn.timestamp) ?? toIsoDate(rawTurn.created_at),
              metadata: {
                importer: 'copilot',
              },
            }];
          }

          const prompt = extractText(rawTurn.prompt ?? '');
          const response = extractText(rawTurn.response ?? '');
          const split: Array<{ turnIndex: number; role: 'system' | 'user' | 'assistant' | 'tool'; content: string; timestamp?: string; metadata: Record<string, unknown> }> = [];

          if (prompt) {
            split.push({
              turnIndex: index * 2,
              role: 'user',
              content: prompt,
              timestamp: toIsoDate(rawTurn.timestamp) ?? toIsoDate(rawTurn.created_at),
              metadata: { importer: 'copilot', splitRole: 'prompt' },
            });
          }

          if (response) {
            split.push({
              turnIndex: index * 2 + 1,
              role: 'assistant',
              content: response,
              timestamp: toIsoDate(rawTurn.timestamp) ?? toIsoDate(rawTurn.created_at),
              metadata: { importer: 'copilot', splitRole: 'response' },
            });
          }

          return split;
        })
        .filter((turn) => turn.content.length > 0)
        .sort((left, right) => left.turnIndex - right.turnIndex)
        .map((turn, index) => ({
          ...turn,
          turnIndex: index,
        }));

      if (turns.length === 0) continue;

      conversations.push({
        provider: 'copilot',
        externalThreadId: item.threadId ?? item.id,
        title: stableTitle(item.title ?? item.name, 'Untitled Copilot Conversation'),
        sourcePath: context.filePath,
        createdAt: toIsoDate(item.created_at),
        updatedAt: toIsoDate(item.updated_at),
        metadata: {
          importer: 'copilot',
        },
        turns,
      });
    }

    if (conversations.length === 0) {
      const fallback = parseRoleTaggedTranscript(context.rawContent);
      if (fallback.length > 0) {
        conversations.push({
          provider: 'copilot',
          title: 'Untitled Copilot Conversation',
          sourcePath: context.filePath,
          metadata: {
            importer: 'copilot',
            sourceFormat: 'transcript',
          },
          turns: fallback.map((turn, index) => ({
            turnIndex: index,
            role: turn.role,
            content: turn.content,
            metadata: {},
          })),
        });
      }
    }

    return conversations;
  }
}
