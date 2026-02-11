import { describe, expect, it } from 'vitest';
import { ProviderImportDetector } from './detector.js';

const detector = new ProviderImportDetector();

describe('ProviderImportDetector', () => {
  it('detects chatgpt export mapping format', () => {
    const payload = JSON.stringify([
      {
        title: 'ChatGPT Sample',
        create_time: 1710000000,
        mapping: {
          a: {
            id: 'a',
            message: {
              author: { role: 'user' },
              content: { content_type: 'text', parts: ['hello'] },
              create_time: 1710000000,
            },
          },
        },
      },
    ]);

    const result = detector.detect('intake/chatgpt/conversations.json', payload);
    expect(result.importer?.id).toBe('chatgpt');
    const parsed = result.importer?.parse(result.context) ?? [];
    expect(parsed.length).toBe(1);
    expect(parsed[0].turns.length).toBe(1);
  });

  it('detects claude export chat_messages format', () => {
    const payload = JSON.stringify([
      {
        uuid: 'conv-1',
        name: 'Claude Sample',
        chat_messages: [
          {
            uuid: 'msg-1',
            sender: 'human',
            text: 'hello from claude',
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    ]);

    const result = detector.detect('intake/claude/conversations.json', payload);
    expect(result.importer?.id).toBe('claude');
    const parsed = result.importer?.parse(result.context) ?? [];
    expect(parsed.length).toBe(1);
    expect(parsed[0].provider).toBe('claude');
  });

  it('detects gemini message-array format', () => {
    const payload = JSON.stringify({
      id: 'gem-1',
      title: 'Gemini Sample',
      messages: [
        { role: 'user', text: 'gemini ask' },
        { role: 'model', text: 'gemini answer' },
      ],
    });

    const result = detector.detect('intake/gemini/chat.json', payload);
    expect(result.importer?.id).toBe('gemini');
    const parsed = result.importer?.parse(result.context) ?? [];
    expect(parsed.length).toBe(1);
    expect(parsed[0].turns.length).toBe(2);
  });

  it('detects grok conversations', () => {
    const payload = JSON.stringify([
      {
        id: 'grok-1',
        title: 'Grok Sample',
        turns: [
          { role: 'user', content: 'grok question' },
          { role: 'assistant', content: 'grok answer' },
        ],
      },
    ]);

    const result = detector.detect('intake/grok/data.json', payload);
    expect(result.importer?.id).toBe('grok');
  });

  it('detects copilot exchanges', () => {
    const payload = JSON.stringify({
      threadId: 'copilot-1',
      title: 'Copilot Sample',
      exchanges: [
        { prompt: 'how do I test', response: 'use vitest' },
      ],
    });

    const result = detector.detect('intake/copilot/chat.json', payload);
    expect(result.importer?.id).toBe('copilot');
    const parsed = result.importer?.parse(result.context) ?? [];
    expect(parsed.length).toBe(1);
    expect(parsed[0].turns.length).toBe(2);
  });
});
