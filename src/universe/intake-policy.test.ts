import { describe, expect, it } from 'vitest';
import { IntakePolicyEngine } from './intake-policy.js';

describe('IntakePolicyEngine', () => {
  const policy = new IntakePolicyEngine();

  it('quarantines blocked extension', () => {
    const result = policy.evaluate({
      relativePath: 'secrets/private.key',
      rawContent: 'PRIVATE KEY CONTENT',
      bytes: 64,
    });

    expect(result.allowed).toBe(false);
    expect(result.quarantined).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('redacts secrets from allowed files', () => {
    const result = policy.evaluate({
      relativePath: 'safe/chat.json',
      rawContent: '{"token":"sk-ant-api12345678901234567890123456789012345678901234567890123456789012345678901234567890"}',
      bytes: 200,
    });

    expect(result.redacted).toBe(true);
    expect(result.redactedContent).toContain('[REDACTED');
  });

  it('allows normal archive content', () => {
    const result = policy.evaluate({
      relativePath: 'archive/chatgpt/conversations.json',
      rawContent: '{"title":"Safe chat"}',
      bytes: 32,
    });

    expect(result.allowed).toBe(true);
    expect(result.quarantined).toBe(false);
  });
});
