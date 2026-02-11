import { describe, expect, it } from 'vitest';
import { ChatGPTImporter } from './chatgpt.js';
import { ClaudeImporter } from './claude.js';
import { GeminiImporter } from './gemini.js';
import { GrokImporter } from './grok.js';
import { CopilotImporter } from './copilot.js';
import { ProviderImporter } from './types.js';

function parseWith(importer: ProviderImporter, filePath: string, rawContent: string) {
  return importer.parse({
    filePath,
    rawContent,
    parsedJson: (() => {
      try {
        return JSON.parse(rawContent);
      } catch {
        return undefined;
      }
    })(),
  });
}

describe('Provider importers', () => {
  it('parses ChatGPT mapping JSON exports', () => {
    const importer = new ChatGPTImporter();
    const payload = JSON.stringify([
      {
        id: 'chatgpt-thread-1',
        title: 'ChatGPT Mapping',
        mapping: {
          one: {
            message: {
              id: 'm1',
              author: { role: 'user' },
              content: { parts: ['How do I tune chunking?'] },
              create_time: 1710000000,
            },
          },
          two: {
            message: {
              id: 'm2',
              author: { role: 'assistant' },
              content: { parts: ['Use overlap and min token guards.'] },
              create_time: 1710000001,
            },
          },
        },
      },
    ]);

    const parsed = parseWith(importer, 'intake/chatgpt/conversations.json', payload);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].provider).toBe('chatgpt');
    expect(parsed[0].turns).toHaveLength(2);
    expect(parsed[0].turns[0].role).toBe('user');
    expect(parsed[0].turns[1].role).toBe('assistant');
  });

  it('parses ChatGPT HTML fallback exports', () => {
    const importer = new ChatGPTImporter();
    const html = `
<!doctype html>
<html>
  <head><title>ChatGPT HTML Export</title></head>
  <body>
    <div data-message-author-role="user">Show me all references to nebula.</div>
    <div data-message-author-role="assistant">Use global term occurrence lookup.</div>
  </body>
</html>
`;

    const parsed = parseWith(importer, 'intake/chatgpt/chat.html', html);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe('ChatGPT HTML Export');
    expect(parsed[0].turns).toHaveLength(2);
    expect(parsed[0].turns[0].role).toBe('user');
    expect(parsed[0].turns[1].role).toBe('assistant');
  });

  it('parses Claude JSON exports', () => {
    const importer = new ClaudeImporter();
    const payload = JSON.stringify([
      {
        uuid: 'claude-thread-1',
        name: 'Claude JSON',
        account_uuid: 'claude-account-1',
        chat_messages: [
          { uuid: 'c1', sender: 'human', text: 'Find drift in release docs.' },
          { uuid: 'c2', sender: 'assistant', text: 'Add CI parity gates and evidence links.' },
        ],
      },
    ]);

    const parsed = parseWith(importer, 'intake/claude/export.json', payload);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].provider).toBe('claude');
    expect(parsed[0].externalAccountId).toBe('claude-account-1');
    expect(parsed[0].turns).toHaveLength(2);
  });

  it('parses Gemini structured payloads', () => {
    const importer = new GeminiImporter();
    const payload = JSON.stringify({
      conversations: [
        {
          id: 'gemini-thread-1',
          title: 'Gemini Structured',
          turns: [
            { role: 'user', text: 'Map provider metadata.' },
            { role: 'model', text: 'Use normalized provider/account/thread schema.' },
          ],
        },
      ],
    });

    const parsed = parseWith(importer, 'intake/gemini/conversations.json', payload);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].provider).toBe('gemini');
    expect(parsed[0].turns).toHaveLength(2);
    expect(parsed[0].turns[1].role).toBe('assistant');
  });

  it('parses Grok transcript fallback', () => {
    const importer = new GrokImporter();
    const transcript = `
# Grok Session
User: correlate nebula themes across providers
Assistant: build cooccurrence edges and filter by weight
`;

    const parsed = parseWith(importer, 'intake/grok/session.md', transcript);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].provider).toBe('grok');
    expect(parsed[0].turns).toHaveLength(2);
    expect(parsed[0].turns[0].role).toBe('user');
  });

  it('parses Copilot prompt/response exchanges', () => {
    const importer = new CopilotImporter();
    const payload = JSON.stringify({
      threadId: 'copilot-thread-1',
      title: 'Copilot Exchanges',
      exchanges: [
        {
          prompt: 'How do I test universe endpoints?',
          response: 'Use integration tests and schema assertions.',
        },
      ],
    });

    const parsed = parseWith(importer, 'intake/copilot/exchanges.json', payload);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].provider).toBe('copilot');
    expect(parsed[0].turns).toHaveLength(2);
    expect(parsed[0].turns[0].role).toBe('user');
    expect(parsed[0].turns[1].role).toBe('assistant');
  });
});
