import { NormalizedConversation, ProviderImporter, ProviderImporterContext } from './types.js';
import { JSDOM } from 'jsdom';
import { extractText, mapRole, parseRoleTaggedTranscript, stableTitle, toIsoDate } from './utils.js';

interface ChatGPTMappingNode {
  id?: string;
  parent?: string;
  message?: {
    id?: string;
    author?: { role?: string };
    content?: {
      content_type?: string;
      parts?: unknown[];
      text?: string;
    };
    create_time?: number;
    update_time?: number;
  };
}

interface ChatGPTConversation {
  id?: string;
  conversation_id?: string;
  title?: string;
  create_time?: number;
  update_time?: number;
  mapping?: Record<string, ChatGPTMappingNode>;
}

function parseConversationArray(parsed: unknown, filePath: string): NormalizedConversation[] {
  if (!Array.isArray(parsed)) return [];

  const conversations: NormalizedConversation[] = [];

  for (const rawItem of parsed) {
    if (!rawItem || typeof rawItem !== 'object') continue;
    const item = rawItem as ChatGPTConversation;
    if (!item.mapping || typeof item.mapping !== 'object') continue;

    const nodes = Object.values(item.mapping)
      .filter((node) => node?.message)
      .map((node) => node as ChatGPTMappingNode)
      .sort((left, right) => {
        const leftTime = left.message?.create_time ?? 0;
        const rightTime = right.message?.create_time ?? 0;
        return leftTime - rightTime;
      });

    const turns = nodes
      .map((node, index) => {
        const message = node.message;
        if (!message) return null;
        const text = extractText(message.content?.parts ?? message.content?.text ?? '');
        if (!text) return null;
        return {
          turnIndex: index,
          role: mapRole(message.author?.role),
          content: text,
          timestamp: toIsoDate(message.create_time) ?? toIsoDate(message.update_time),
          metadata: {
            sourceMessageId: message.id,
          },
        };
      })
      .filter((turn): turn is NonNullable<typeof turn> => turn !== null);

    if (turns.length === 0) continue;

    conversations.push({
      provider: 'chatgpt',
      externalThreadId: item.id ?? item.conversation_id,
      title: stableTitle(item.title, 'Untitled ChatGPT Conversation'),
      sourcePath: filePath,
      createdAt: toIsoDate(item.create_time),
      updatedAt: toIsoDate(item.update_time),
      metadata: {
        importer: 'chatgpt',
        sourceFormat: 'json',
      },
      turns,
    });
  }

  return conversations;
}

function parseHtmlConversation(context: ProviderImporterContext): NormalizedConversation[] {
  if (!context.rawContent.trim()) return [];

  try {
    const dom = new JSDOM(context.rawContent);
    const document = dom.window.document;
    const messageNodes = Array.from(document.querySelectorAll('[data-message-author-role]'));

    const turns = messageNodes
      .map((node, index) => {
        const role = mapRole(node.getAttribute('data-message-author-role'));
        const content = extractText(node.textContent ?? '');
        if (!content) return null;

        return {
          turnIndex: index,
          role,
          content,
          metadata: {
            sourceSelector: 'data-message-author-role',
          },
        };
      })
      .filter((turn): turn is NonNullable<typeof turn> => turn !== null);

    if (turns.length > 0) {
      return [
        {
          provider: 'chatgpt',
          title: stableTitle(document.title, 'Untitled ChatGPT Conversation'),
          sourcePath: context.filePath,
          metadata: {
            importer: 'chatgpt',
            sourceFormat: 'html',
          },
          turns,
        },
      ];
    }

    const transcriptTurns = parseRoleTaggedTranscript(extractText(document.body?.textContent ?? ''));
    if (transcriptTurns.length === 0) return [];

    return [
      {
        provider: 'chatgpt',
        title: stableTitle(document.title, 'Untitled ChatGPT Conversation'),
        sourcePath: context.filePath,
        metadata: {
          importer: 'chatgpt',
          sourceFormat: 'html-transcript',
        },
        turns: transcriptTurns.map((turn, index) => ({
          turnIndex: index,
          role: turn.role,
          content: turn.content,
          metadata: {
            sourceSelector: 'transcript-fallback',
          },
        })),
      },
    ];
  } catch {
    return [];
  }
}

export class ChatGPTImporter implements ProviderImporter {
  id = 'chatgpt' as const;

  canParse(context: ProviderImporterContext): boolean {
    const path = context.filePath.toLowerCase();
    if (path.includes('chatgpt')) return true;

    const parsed = context.parsedJson;
    if (Array.isArray(parsed)) {
      return parsed.some((item) => {
        if (!item || typeof item !== 'object') return false;
        const record = item as Record<string, unknown>;
        return typeof record.mapping === 'object' || typeof record.conversation_id === 'string';
      });
    }

    return false;
  }

  parse(context: ProviderImporterContext): NormalizedConversation[] {
    const fromJson = parseConversationArray(context.parsedJson, context.filePath);
    if (fromJson.length > 0) {
      return fromJson;
    }

    if (context.rawContent.includes('<html') || context.filePath.toLowerCase().endsWith('.html')) {
      return parseHtmlConversation(context);
    }

    const transcriptTurns = parseRoleTaggedTranscript(context.rawContent);
    if (transcriptTurns.length === 0) return [];

    return [
      {
        provider: 'chatgpt',
        title: 'Untitled ChatGPT Conversation',
        sourcePath: context.filePath,
        metadata: {
          importer: 'chatgpt',
          sourceFormat: 'transcript',
        },
        turns: transcriptTurns.map((turn, index) => ({
          turnIndex: index,
          role: turn.role,
          content: turn.content,
          metadata: {},
        })),
      },
    ];
  }
}
