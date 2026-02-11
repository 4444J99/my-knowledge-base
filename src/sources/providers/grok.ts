import { NormalizedConversation, ProviderImporter, ProviderImporterContext } from './types.js';
import { extractText, mapRole, parseRoleTaggedTranscript, stableTitle, toIsoDate } from './utils.js';

interface GrokMessage {
  role?: string;
  author?: string;
  sender?: string;
  content?: unknown;
  text?: string;
  created_at?: string;
  timestamp?: string | number;
}

interface GrokConversation {
  id?: string;
  conversation_id?: string;
  title?: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  messages?: GrokMessage[];
  turns?: GrokMessage[];
}

function normalizeConversations(input: unknown): GrokConversation[] {
  if (Array.isArray(input)) {
    return input.filter((item): item is GrokConversation => !!item && typeof item === 'object');
  }

  if (!input || typeof input !== 'object') return [];
  const record = input as Record<string, unknown>;

  if (Array.isArray(record.conversations)) {
    return record.conversations.filter((item): item is GrokConversation => !!item && typeof item === 'object');
  }

  if (Array.isArray(record.messages) || Array.isArray(record.turns)) {
    return [record as unknown as GrokConversation];
  }

  return [];
}

export class GrokImporter implements ProviderImporter {
  id = 'grok' as const;

  canParse(context: ProviderImporterContext): boolean {
    const path = context.filePath.toLowerCase();
    if (path.includes('grok') || path.includes('xai')) return true;

    const parsed = context.parsedJson;
    const items = normalizeConversations(parsed);
    return items.some((item) => {
      const turns = Array.isArray(item.messages) ? item.messages : item.turns;
      return Array.isArray(turns) && turns.length > 0;
    });
  }

  parse(context: ProviderImporterContext): NormalizedConversation[] {
    const items = normalizeConversations(context.parsedJson);
    const conversations: NormalizedConversation[] = [];

    for (const item of items) {
      const rawTurns = Array.isArray(item.messages)
        ? item.messages
        : Array.isArray(item.turns)
        ? item.turns
        : [];

      const turns = rawTurns
        .map((turn, index) => {
          const content = extractText(turn.content ?? turn.text ?? '');
          if (!content) return null;
          return {
            turnIndex: index,
            role: mapRole(turn.role ?? turn.author ?? turn.sender),
            content,
            timestamp: toIsoDate(turn.timestamp) ?? toIsoDate(turn.created_at),
            metadata: {
              importer: 'grok',
            },
          };
        })
        .filter((turn): turn is NonNullable<typeof turn> => turn !== null);

      if (turns.length === 0) continue;

      conversations.push({
        provider: 'grok',
        externalThreadId: item.id ?? item.conversation_id,
        title: stableTitle(item.title ?? item.name, 'Untitled Grok Conversation'),
        sourcePath: context.filePath,
        createdAt: toIsoDate(item.created_at),
        updatedAt: toIsoDate(item.updated_at),
        metadata: {
          importer: 'grok',
        },
        turns,
      });
    }

    if (conversations.length === 0) {
      const fallback = parseRoleTaggedTranscript(context.rawContent);
      if (fallback.length > 0) {
        conversations.push({
          provider: 'grok',
          title: 'Untitled Grok Conversation',
          sourcePath: context.filePath,
          metadata: {
            importer: 'grok',
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
