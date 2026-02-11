import { NormalizedConversation, ProviderImporter, ProviderImporterContext } from './types.js';
import { extractText, mapRole, parseRoleTaggedTranscript, stableTitle, toIsoDate } from './utils.js';

interface GeminiMessage {
  role?: string;
  author?: string;
  sender?: string;
  text?: string;
  content?: unknown;
  created_at?: string;
  timestamp?: string | number;
}

interface GeminiConversation {
  id?: string;
  conversation_id?: string;
  title?: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  messages?: GeminiMessage[];
  turns?: GeminiMessage[];
}

function toConversationArray(value: unknown): GeminiConversation[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is GeminiConversation => !!item && typeof item === 'object');
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.conversations)) {
      return record.conversations.filter((item): item is GeminiConversation => !!item && typeof item === 'object');
    }

    if (Array.isArray(record.messages) || Array.isArray(record.turns)) {
      return [record as unknown as GeminiConversation];
    }
  }

  return [];
}

export class GeminiImporter implements ProviderImporter {
  id = 'gemini' as const;

  canParse(context: ProviderImporterContext): boolean {
    const path = context.filePath.toLowerCase();
    if (path.includes('gemini')) return true;

    const parsed = context.parsedJson;
    const items = toConversationArray(parsed);
    return items.some((item) => Array.isArray(item.messages) || Array.isArray(item.turns));
  }

  parse(context: ProviderImporterContext): NormalizedConversation[] {
    const items = toConversationArray(context.parsedJson);
    const conversations: NormalizedConversation[] = [];

    for (const item of items) {
      const rawTurns = Array.isArray(item.messages)
        ? item.messages
        : Array.isArray(item.turns)
        ? item.turns
        : [];

      const turns = rawTurns
        .map((turn, index) => {
          const content = extractText(turn.text ?? turn.content ?? '');
          if (!content) return null;

          return {
            turnIndex: index,
            role: mapRole(turn.role ?? turn.author ?? turn.sender),
            content,
            timestamp: toIsoDate(turn.timestamp) ?? toIsoDate(turn.created_at),
            metadata: {
              importer: 'gemini',
            },
          };
        })
        .filter((turn): turn is NonNullable<typeof turn> => turn !== null);

      if (turns.length === 0) continue;

      conversations.push({
        provider: 'gemini',
        externalThreadId: item.id ?? item.conversation_id,
        title: stableTitle(item.title ?? item.name, 'Untitled Gemini Conversation'),
        sourcePath: context.filePath,
        createdAt: toIsoDate(item.created_at),
        updatedAt: toIsoDate(item.updated_at),
        metadata: {
          importer: 'gemini',
        },
        turns,
      });
    }

    if (conversations.length === 0) {
      const fallback = parseRoleTaggedTranscript(context.rawContent);
      if (fallback.length > 0) {
        conversations.push({
          provider: 'gemini',
          title: 'Untitled Gemini Conversation',
          sourcePath: context.filePath,
          metadata: {
            importer: 'gemini',
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
