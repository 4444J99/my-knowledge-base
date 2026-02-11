import { describe, expect, it } from 'vitest';
import { parseRoleTaggedTranscript } from './utils.js';

describe('parseRoleTaggedTranscript', () => {
  it('parses colon-delimited role lines', () => {
    const turns = parseRoleTaggedTranscript(`
User: First question
Assistant: First answer
`);

    expect(turns).toHaveLength(2);
    expect(turns[0]).toEqual({
      role: 'user',
      content: 'First question',
    });
    expect(turns[1]).toEqual({
      role: 'assistant',
      content: 'First answer',
    });
  });

  it('parses markdown role headings and multiline content', () => {
    const turns = parseRoleTaggedTranscript(`
## User
Show me a migration plan.

## Assistant
1. Add schema
2. Run backfill
`);

    expect(turns).toHaveLength(2);
    expect(turns[0].role).toBe('user');
    expect(turns[0].content).toContain('migration plan');
    expect(turns[1].role).toBe('assistant');
    expect(turns[1].content).toContain('Add schema');
  });

  it('maps prompt/response aliases to user/assistant', () => {
    const turns = parseRoleTaggedTranscript(`
Prompt: How do I verify parity?
Response: Run smoke tests against both endpoints.
`);

    expect(turns).toHaveLength(2);
    expect(turns[0].role).toBe('user');
    expect(turns[1].role).toBe('assistant');
  });
});
