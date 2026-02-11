import { NormalizedConversation, ProviderImporter, ProviderImporterContext } from './types.js';
import { extractText, mapRole, parseRoleTaggedTranscript, stableTitle, toIsoDate } from './utils.js';

interface ClaudeExportMessage {
  uuid?: string;
  sender?: string;
  text?: string;
  content?: unknown;
  created_at?: string;
  updated_at?: string;
}

interface ClaudeExportConversation {
  uuid?: string;
  name?: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
  account_uuid?: string;
  chat_messages?: ClaudeExportMessage[];
  messages?: ClaudeExportMessage[];
}

export class ClaudeImporter implements ProviderImporter {
  id = 'claude' as const;

  canParse(context: ProviderImporterContext): boolean {
    const path = context.filePath.toLowerCase();
    if (path.includes('claude')) return true;

    const parsed = context.parsedJson;
    if (!Array.isArray(parsed)) return false;

    return parsed.some((item) => {
      if (!item || typeof item !== 'object') return false;
      const record = item as Record<string, unknown>;
      return Array.isArray(record.chat_messages) || record.account_uuid !== undefined;
    });
  }

  parse(context: ProviderImporterContext): NormalizedConversation[] {
    const parsed = context.parsedJson;
    if (!Array.isArray(parsed)) {
      const fallback = parseRoleTaggedTranscript(context.rawContent);
      if (fallback.length === 0) return [];
      return [
        {
          provider: 'claude',
          title: 'Untitled Claude Conversation',
          sourcePath: context.filePath,
          metadata: {
            importer: 'claude',
            sourceFormat: 'transcript',
          },
          turns: fallback.map((turn, index) => ({
            turnIndex: index,
            role: turn.role,
            content: turn.content,
            metadata: {},
          })),
        },
      ];
    }

    const conversations: NormalizedConversation[] = [];

    for (const rawItem of parsed) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const item = rawItem as ClaudeExportConversation;
      const messages = Array.isArray(item.chat_messages)
        ? item.chat_messages
        : Array.isArray(item.messages)
        ? item.messages
        : [];

      const turns = messages
        .map((message, index) => {
          const content = extractText(message.text ?? message.content ?? '');
          if (!content) return null;
          return {
            turnIndex: index,
            role: mapRole(message.sender),
            content,
            timestamp: toIsoDate(message.created_at) ?? toIsoDate(message.updated_at),
            metadata: {
              sourceMessageId: message.uuid,
            },
          };
        })
        .filter((turn): turn is NonNullable<typeof turn> => turn !== null);

      if (turns.length === 0) continue;

      conversations.push({
        provider: 'claude',
        externalThreadId: item.uuid,
        externalAccountId: item.account_uuid,
        title: stableTitle(item.name ?? item.title, 'Untitled Claude Conversation'),
        sourcePath: context.filePath,
        createdAt: toIsoDate(item.created_at),
        updatedAt: toIsoDate(item.updated_at),
        metadata: {
          importer: 'claude',
        },
        turns,
      });
    }

    if (conversations.length === 0) {
      const fallback = parseRoleTaggedTranscript(context.rawContent);
      if (fallback.length > 0) {
        conversations.push({
          provider: 'claude',
          title: 'Untitled Claude Conversation',
          sourcePath: context.filePath,
          metadata: {
            importer: 'claude',
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
