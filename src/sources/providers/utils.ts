export function toIsoDate(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const millis = value > 1_000_000_000_000 ? value : value * 1000;
    const d = new Date(millis);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
}

export function mapRole(value: unknown): 'system' | 'user' | 'assistant' | 'tool' {
  const role = typeof value === 'string' ? value.toLowerCase() : '';
  if (role === 'human' || role === 'user' || role === 'prompt') return 'user';
  if (role === 'assistant' || role === 'model' || role === 'bot' || role === 'response') return 'assistant';
  if (role === 'system') return 'system';
  if (role === 'tool' || role === 'function') return 'tool';
  return 'assistant';
}

export interface RoleTaggedTurn {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export function extractText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    return value.map((item) => extractText(item)).filter(Boolean).join('\n').trim();
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const knownKeys = ['text', 'content', 'message', 'value', 'body', 'markdown', 'parts'];
    for (const key of knownKeys) {
      if (key in record) {
        const extracted = extractText(record[key]);
        if (extracted) return extracted;
      }
    }

    return Object.values(record)
      .map((item) => extractText(item))
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  return '';
}

export function maybeJson(rawContent: string): unknown | undefined {
  try {
    return JSON.parse(rawContent);
  } catch {
    return undefined;
  }
}

export function stableTitle(title: unknown, fallback: string): string {
  if (typeof title !== 'string') return fallback;
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Parses role-tagged plain text/markdown transcripts like:
 * - `User: ...`
 * - `Assistant: ...`
 * - `## User`
 * - `Prompt: ...` / `Response: ...`
 */
export function parseRoleTaggedTranscript(rawContent: string): RoleTaggedTurn[] {
  if (!rawContent.trim()) return [];

  const lines = rawContent.replace(/\r\n?/g, '\n').split('\n');
  const turns: RoleTaggedTurn[] = [];
  const roleLine = /^\s*(?:[#>*\-\s]*)?(user|assistant|system|tool|human|model|bot|prompt|response)\s*[:\-]\s*(.*)$/i;
  const roleHeading = /^\s*#{1,6}\s*(user|assistant|system|tool|human|model|bot|prompt|response)\s*$/i;

  let currentRole: RoleTaggedTurn['role'] | null = null;
  let buffer: string[] = [];

  const commit = () => {
    if (!currentRole) return;
    const content = buffer.join('\n').trim();
    if (!content) return;
    turns.push({
      role: currentRole,
      content,
    });
  };

  for (const line of lines) {
    const tagged = line.match(roleLine);
    if (tagged) {
      commit();
      currentRole = mapRole(tagged[1]);
      buffer = [];
      if (tagged[2]) {
        buffer.push(tagged[2]);
      }
      continue;
    }

    const heading = line.match(roleHeading);
    if (heading) {
      commit();
      currentRole = mapRole(heading[1]);
      buffer = [];
      continue;
    }

    if (!currentRole) continue;
    buffer.push(line);
  }

  commit();
  return turns;
}
