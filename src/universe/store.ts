import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type {
  ChatThread as ChatThreadRecord,
  ChatTurn as ChatTurnRecord,
  ParallelNetworkEdge,
  ProviderAccount as ProviderAccountRecord,
  ProviderId,
  ProviderRecord,
  TermOccurrence,
  UniverseChat,
  UniverseIngestRun,
  UniverseSummary,
} from '@knowledge-base/contracts';
import { ensureUniverseSchema } from './schema.js';

export interface UpsertThreadInput {
  providerRefId: string;
  accountRefId?: string;
  externalThreadId?: string;
  title: string;
  sourcePath: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface UpsertTurnInput {
  id?: string;
  turnIndex: number;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp?: string;
  pairTurnId?: string;
  metadata?: Record<string, unknown>;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface IngestRunCounts {
  filesScanned: number;
  filesIngested: number;
  filesQuarantined: number;
  chatsIngested: number;
  turnsIngested: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

function parseJsonRecord(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore malformed JSON
  }
  return {};
}

const KNOWN_PROVIDER_IDS: ReadonlySet<ProviderId> = new Set([
  'chatgpt',
  'claude',
  'gemini',
  'grok',
  'copilot',
  'unknown',
]);

function coerceProviderId(value: string): ProviderId {
  return KNOWN_PROVIDER_IDS.has(value as ProviderId) ? (value as ProviderId) : 'unknown';
}

function toProviderRecord(row: any): ProviderRecord {
  return {
    id: row.id,
    providerId: row.provider_id,
    displayName: row.display_name,
    metadata: parseJsonRecord(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAccountRecord(row: any): ProviderAccountRecord {
  return {
    id: row.id,
    providerRefId: row.provider_ref_id,
    externalAccountId: row.external_account_id ?? undefined,
    displayName: row.display_name ?? undefined,
    email: row.email ?? undefined,
    metadata: parseJsonRecord(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toThreadRecord(row: any): ChatThreadRecord {
  return {
    id: row.id,
    providerRefId: row.provider_ref_id,
    accountRefId: row.account_ref_id ?? undefined,
    externalThreadId: row.external_thread_id ?? undefined,
    title: row.title,
    sourcePath: row.source_path,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    metadata: parseJsonRecord(row.metadata),
  };
}

function toTurnRecord(row: any): ChatTurnRecord {
  return {
    id: row.id,
    threadId: row.thread_id,
    turnIndex: row.turn_index,
    role: row.role,
    content: row.content,
    timestamp: row.timestamp ?? undefined,
    pairTurnId: row.pair_turn_id ?? undefined,
    metadata: parseJsonRecord(row.metadata),
  };
}

interface TokenHit {
  term: string;
  normalizedTerm: string;
  position: number;
  contextBefore: string;
  contextAfter: string;
}

function tokenizeWithContext(content: string): TokenHit[] {
  const tokens: TokenHit[] = [];
  const regex = /[A-Za-z0-9_'-]+/g;
  let match: RegExpExecArray | null;
  let position = 0;

  while ((match = regex.exec(content)) !== null) {
    const term = match[0];
    const normalized = term.toLowerCase();
    if (normalized.length < 2) continue;

    const start = Math.max(0, match.index - 24);
    const end = Math.min(content.length, match.index + term.length + 24);

    tokens.push({
      term,
      normalizedTerm: normalized,
      position,
      contextBefore: content.slice(start, match.index),
      contextAfter: content.slice(match.index + term.length, end),
    });

    position += 1;
  }

  return tokens;
}

export class UniverseStore {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    ensureUniverseSchema(this.db);
  }

  upsertProvider(providerId: ProviderId, displayName?: string, metadata: Record<string, unknown> = {}): ProviderRecord {
    const now = nowIso();
    const existing = this.db
      .prepare('SELECT * FROM providers WHERE provider_id = ?')
      .get(providerId) as any | undefined;

    const resolvedName = displayName || providerId.toUpperCase();
    if (existing) {
      this.db
        .prepare(`
          UPDATE providers
          SET display_name = ?, metadata = ?, updated_at = ?
          WHERE id = ?
        `)
        .run(resolvedName, JSON.stringify(metadata), now, existing.id);

      const updated = this.db.prepare('SELECT * FROM providers WHERE id = ?').get(existing.id) as any;
      return toProviderRecord(updated);
    }

    const id = randomUUID();
    this.db
      .prepare(`
        INSERT INTO providers (id, provider_id, display_name, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(id, providerId, resolvedName, JSON.stringify(metadata), now, now);

    const inserted = this.db.prepare('SELECT * FROM providers WHERE id = ?').get(id) as any;
    return toProviderRecord(inserted);
  }

  upsertProviderAccount(input: {
    providerRefId: string;
    externalAccountId?: string;
    displayName?: string;
    email?: string;
    metadata?: Record<string, unknown>;
  }): ProviderAccountRecord {
    const now = nowIso();
    const lookupExternal = input.externalAccountId || null;

    const existing = this.db
      .prepare(`
        SELECT * FROM provider_accounts
        WHERE provider_ref_id = ? AND COALESCE(external_account_id, '') = COALESCE(?, '')
      `)
      .get(input.providerRefId, lookupExternal) as any | undefined;

    if (existing) {
      this.db
        .prepare(`
          UPDATE provider_accounts
          SET display_name = ?, email = ?, metadata = ?, updated_at = ?
          WHERE id = ?
        `)
        .run(
          input.displayName ?? null,
          input.email ?? null,
          JSON.stringify(input.metadata ?? {}),
          now,
          existing.id,
        );
      const updated = this.db.prepare('SELECT * FROM provider_accounts WHERE id = ?').get(existing.id) as any;
      return toAccountRecord(updated);
    }

    const id = randomUUID();
    this.db
      .prepare(`
        INSERT INTO provider_accounts (
          id,
          provider_ref_id,
          external_account_id,
          display_name,
          email,
          metadata,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        id,
        input.providerRefId,
        lookupExternal,
        input.displayName ?? null,
        input.email ?? null,
        JSON.stringify(input.metadata ?? {}),
        now,
        now,
      );

    const inserted = this.db.prepare('SELECT * FROM provider_accounts WHERE id = ?').get(id) as any;
    return toAccountRecord(inserted);
  }

  upsertChatThread(input: UpsertThreadInput): ChatThreadRecord {
    const now = nowIso();
    const existing = this.db
      .prepare(`
        SELECT * FROM chat_threads
        WHERE provider_ref_id = ?
          AND (source_path = ? OR (external_thread_id IS NOT NULL AND external_thread_id = ?))
        LIMIT 1
      `)
      .get(input.providerRefId, input.sourcePath, input.externalThreadId ?? null) as any | undefined;

    if (existing) {
      this.db
        .prepare(`
          UPDATE chat_threads
          SET account_ref_id = ?,
              external_thread_id = ?,
              title = ?,
              source_path = ?,
              created_at = ?,
              updated_at = ?,
              metadata = ?
          WHERE id = ?
        `)
        .run(
          input.accountRefId ?? null,
          input.externalThreadId ?? null,
          input.title,
          input.sourcePath,
          input.createdAt ?? existing.created_at ?? null,
          input.updatedAt ?? now,
          JSON.stringify(input.metadata ?? {}),
          existing.id,
        );

      const updated = this.db.prepare('SELECT * FROM chat_threads WHERE id = ?').get(existing.id) as any;
      return toThreadRecord(updated);
    }

    const id = randomUUID();
    this.db
      .prepare(`
        INSERT INTO chat_threads (
          id,
          provider_ref_id,
          account_ref_id,
          external_thread_id,
          title,
          source_path,
          created_at,
          updated_at,
          metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        id,
        input.providerRefId,
        input.accountRefId ?? null,
        input.externalThreadId ?? null,
        input.title,
        input.sourcePath,
        input.createdAt ?? now,
        input.updatedAt ?? now,
        JSON.stringify(input.metadata ?? {}),
      );

    const inserted = this.db.prepare('SELECT * FROM chat_threads WHERE id = ?').get(id) as any;
    return toThreadRecord(inserted);
  }

  private syncConversationBridge(thread: ChatThreadRecord): void {
    const existing = this.db
      .prepare('SELECT id, title, created, url FROM conversations WHERE id = ?')
      .get(thread.id) as any | undefined;

    if (!existing) {
      this.db
        .prepare(`
          INSERT INTO conversations (
            id,
            title,
            created,
            url,
            exported_at,
            provider_id,
            provider_account_id,
            source_path,
            source_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          thread.id,
          thread.title,
          thread.createdAt ?? nowIso(),
          null,
          nowIso(),
          thread.providerRefId,
          thread.accountRefId ?? null,
          thread.sourcePath,
          'chat',
        );
      return;
    }

    this.db
      .prepare(`
        UPDATE conversations
        SET title = ?,
            provider_id = ?,
            provider_account_id = ?,
            source_path = ?,
            source_type = ?,
            exported_at = ?
        WHERE id = ?
      `)
      .run(
        thread.title,
        thread.providerRefId,
        thread.accountRefId ?? null,
        thread.sourcePath,
        'chat',
        nowIso(),
        thread.id,
      );
  }

  replaceThreadTurns(threadId: string, providerRefId: string, turns: UpsertTurnInput[]): ChatTurnRecord[] {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM term_occurrences WHERE thread_id = ?').run(threadId);
      this.db.prepare('DELETE FROM chat_turns WHERE thread_id = ?').run(threadId);

      const insertTurn = this.db.prepare(`
        INSERT INTO chat_turns (
          id,
          thread_id,
          turn_index,
          role,
          content,
          timestamp,
          pair_turn_id,
          metadata,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertedIds: string[] = [];
      const now = nowIso();
      for (const turn of turns) {
        const id = turn.id ?? randomUUID();
        insertTurn.run(
          id,
          threadId,
          turn.turnIndex,
          turn.role,
          turn.content,
          turn.timestamp ?? null,
          turn.pairTurnId ?? null,
          JSON.stringify(turn.metadata ?? {}),
          now,
        );
        insertedIds.push(id);
      }

      this.indexThreadTerms(threadId, providerRefId);
      this.rebuildCooccurrenceEdgesForThread(threadId);

      return insertedIds;
    });

    const inserted = transaction();
    const placeholders = inserted.map(() => '?').join(', ');
    if (!placeholders) return [];

    const rows = this.db
      .prepare(`
        SELECT * FROM chat_turns
        WHERE id IN (${placeholders})
        ORDER BY turn_index ASC
      `)
      .all(...inserted) as any[];

    return rows.map(toTurnRecord);
  }

  private getOrCreateLexiconId(term: string, normalizedTerm: string): number {
    const now = nowIso();
    const existing = this.db
      .prepare('SELECT id FROM term_lexicon WHERE normalized_term = ?')
      .get(normalizedTerm) as { id: number } | undefined;

    if (existing) {
      return existing.id;
    }

    this.db
      .prepare('INSERT INTO term_lexicon (term, normalized_term, doc_freq, created_at) VALUES (?, ?, 0, ?)')
      .run(term, normalizedTerm, now);

    const created = this.db
      .prepare('SELECT id FROM term_lexicon WHERE normalized_term = ?')
      .get(normalizedTerm) as { id: number };

    return created.id;
  }

  private indexThreadTerms(threadId: string, providerRefId: string): void {
    const turns = this.db
      .prepare('SELECT id, content FROM chat_turns WHERE thread_id = ? ORDER BY turn_index ASC')
      .all(threadId) as Array<{ id: string; content: string }>;

    const insertOccurrence = this.db.prepare(`
      INSERT INTO term_occurrences (
        id,
        lexicon_id,
        provider_ref_id,
        thread_id,
        turn_id,
        position,
        context_before,
        context_after,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const turn of turns) {
      const tokens = tokenizeWithContext(turn.content);
      for (const token of tokens) {
        const lexiconId = this.getOrCreateLexiconId(token.term, token.normalizedTerm);
        insertOccurrence.run(
          randomUUID(),
          lexiconId,
          providerRefId,
          threadId,
          turn.id,
          token.position,
          token.contextBefore,
          token.contextAfter,
          nowIso(),
        );
      }
    }

    this.db.exec(`
      UPDATE term_lexicon
      SET doc_freq = (
        SELECT COUNT(DISTINCT thread_id)
        FROM term_occurrences
        WHERE lexicon_id = term_lexicon.id
      )
    `);
  }

  private rebuildCooccurrenceEdgesForThread(threadId: string): void {
    this.db
      .prepare(`
        DELETE FROM thematic_edges
        WHERE edge_type = 'cooccurrence' AND source_thread_id = ?
      `)
      .run(threadId);

    const rows = this.db
      .prepare(`
        WITH source_terms AS (
          SELECT DISTINCT lexicon_id
          FROM term_occurrences
          WHERE thread_id = ?
        )
        SELECT
          o.thread_id as target_thread_id,
          COUNT(DISTINCT o.lexicon_id) as shared_terms
        FROM term_occurrences o
        JOIN source_terms st ON st.lexicon_id = o.lexicon_id
        WHERE o.thread_id != ?
        GROUP BY o.thread_id
        HAVING shared_terms > 0
        ORDER BY shared_terms DESC
        LIMIT 100
      `)
      .all(threadId, threadId) as Array<{ target_thread_id: string; shared_terms: number }>;

    const upsert = this.db.prepare(`
      INSERT INTO thematic_edges (
        id,
        source_thread_id,
        target_thread_id,
        edge_type,
        weight,
        evidence,
        created_at
      ) VALUES (?, ?, ?, 'cooccurrence', ?, ?, ?)
      ON CONFLICT(source_thread_id, target_thread_id, edge_type)
      DO UPDATE SET weight = excluded.weight, evidence = excluded.evidence, created_at = excluded.created_at
    `);

    for (const row of rows) {
      upsert.run(
        randomUUID(),
        threadId,
        row.target_thread_id,
        row.shared_terms,
        JSON.stringify({ sharedTerms: row.shared_terms }),
        nowIso(),
      );
    }
  }

  getUniverseSummary(): UniverseSummary {
    const providers = (this.db.prepare('SELECT COUNT(*) as count FROM providers').get() as { count: number }).count;
    const accounts = (this.db.prepare('SELECT COUNT(*) as count FROM provider_accounts').get() as { count: number }).count;
    const chats = (this.db.prepare('SELECT COUNT(*) as count FROM chat_threads').get() as { count: number }).count;
    const turns = (this.db.prepare('SELECT COUNT(*) as count FROM chat_turns').get() as { count: number }).count;
    const terms = (this.db.prepare('SELECT COUNT(*) as count FROM term_lexicon').get() as { count: number }).count;
    const occurrences = (this.db.prepare('SELECT COUNT(*) as count FROM term_occurrences').get() as { count: number }).count;

    return {
      providers,
      accounts,
      chats,
      turns,
      terms,
      occurrences,
      updatedAt: nowIso(),
    };
  }

  listProviders(limit: number, offset: number): PagedResult<ProviderRecord> {
    const total = (this.db.prepare('SELECT COUNT(*) as count FROM providers').get() as { count: number }).count;
    const rows = this.db
      .prepare(`
        SELECT * FROM providers
        ORDER BY provider_id ASC
        LIMIT ? OFFSET ?
      `)
      .all(limit, offset) as any[];

    return {
      items: rows.map(toProviderRecord),
      total,
      limit,
      offset,
    };
  }

  listProviderChats(providerId: string, limit: number, offset: number): PagedResult<UniverseChat> {
    const provider = this.db
      .prepare('SELECT id, provider_id, display_name FROM providers WHERE provider_id = ?')
      .get(providerId) as { id: string; provider_id: string; display_name: string } | undefined;

    if (!provider) {
      return { items: [], total: 0, limit, offset };
    }

    const total = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM chat_threads WHERE provider_ref_id = ?')
        .get(provider.id) as { count: number }
    ).count;

    const rows = this.db
      .prepare(`
        SELECT
          t.*,
          COALESCE(turn_counts.turn_count, 0) as turn_count
        FROM chat_threads t
        LEFT JOIN (
          SELECT thread_id, COUNT(*) as turn_count
          FROM chat_turns
          GROUP BY thread_id
        ) turn_counts ON turn_counts.thread_id = t.id
        WHERE t.provider_ref_id = ?
        ORDER BY COALESCE(t.updated_at, t.created_at) DESC, t.title ASC
        LIMIT ? OFFSET ?
      `)
      .all(provider.id, limit, offset) as any[];

    return {
      items: rows.map((row) => ({
        ...toThreadRecord(row),
        providerId: coerceProviderId(provider.provider_id),
        providerName: provider.display_name,
        turnCount: row.turn_count,
      })),
      total,
      limit,
      offset,
    };
  }

  getChat(chatId: string): UniverseChat | undefined {
    const row = this.db
      .prepare(`
        SELECT
          t.*,
          p.provider_id,
          p.display_name as provider_name,
          COALESCE(turn_counts.turn_count, 0) as turn_count
        FROM chat_threads t
        JOIN providers p ON p.id = t.provider_ref_id
        LEFT JOIN (
          SELECT thread_id, COUNT(*) as turn_count
          FROM chat_turns
          GROUP BY thread_id
        ) turn_counts ON turn_counts.thread_id = t.id
        WHERE t.id = ?
      `)
      .get(chatId) as any | undefined;

    if (!row) return undefined;

    return {
      ...toThreadRecord(row),
      providerId: coerceProviderId(row.provider_id),
      providerName: row.provider_name,
      turnCount: row.turn_count,
    };
  }

  listChatTurns(chatId: string, limit: number, offset: number): PagedResult<ChatTurnRecord> {
    const total = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM chat_turns WHERE thread_id = ?')
        .get(chatId) as { count: number }
    ).count;

    const rows = this.db
      .prepare(`
        SELECT * FROM chat_turns
        WHERE thread_id = ?
        ORDER BY turn_index ASC
        LIMIT ? OFFSET ?
      `)
      .all(chatId, limit, offset) as any[];

    return {
      items: rows.map(toTurnRecord),
      total,
      limit,
      offset,
    };
  }

  getChatNetwork(chatId: string, limit: number): ParallelNetworkEdge[] {
    const rows = this.db
      .prepare(`
        SELECT * FROM thematic_edges
        WHERE (source_thread_id = ? OR target_thread_id = ?)
        ORDER BY weight DESC
        LIMIT ?
      `)
      .all(chatId, chatId, limit) as any[];

    return rows.map((row) => ({
      id: row.id,
      sourceThreadId: row.source_thread_id,
      targetThreadId: row.target_thread_id,
      edgeType: row.edge_type,
      weight: row.weight,
      evidence: parseJsonRecord(row.evidence),
    }));
  }

  findTermOccurrences(term: string, limit: number, offset: number): PagedResult<TermOccurrence> {
    const normalized = term.toLowerCase();

    const totalRow = this.db
      .prepare(`
        SELECT COUNT(*) as count
        FROM term_occurrences o
        JOIN term_lexicon l ON l.id = o.lexicon_id
        WHERE l.normalized_term = ?
      `)
      .get(normalized) as { count: number };

    const rows = this.db
      .prepare(`
        SELECT
          o.*,
          l.term,
          l.normalized_term,
          p.provider_id,
          t.title as chat_title,
          ct.turn_index,
          ct.role,
          ct.content
        FROM term_occurrences o
        JOIN term_lexicon l ON l.id = o.lexicon_id
        JOIN providers p ON p.id = o.provider_ref_id
        JOIN chat_threads t ON t.id = o.thread_id
        JOIN chat_turns ct ON ct.id = o.turn_id
        WHERE l.normalized_term = ?
        ORDER BY o.created_at DESC, o.position ASC
        LIMIT ? OFFSET ?
      `)
      .all(normalized, limit, offset) as any[];

    return {
      items: rows.map((row) => ({
        id: row.id,
        term: row.term,
        normalizedTerm: row.normalized_term,
        providerId: coerceProviderId(row.provider_id),
        threadId: row.thread_id,
        turnId: row.turn_id,
        chatTitle: row.chat_title,
        turnIndex: row.turn_index,
        role: row.role,
        content: row.content,
        position: row.position,
        contextBefore: row.context_before,
        contextAfter: row.context_after,
      })),
      total: totalRow.count,
      limit,
      offset,
    };
  }

  listParallelNetworks(limit: number, minWeight: number): ParallelNetworkEdge[] {
    const rows = this.db
      .prepare(`
        SELECT * FROM thematic_edges
        WHERE weight >= ?
        ORDER BY weight DESC
        LIMIT ?
      `)
      .all(minWeight, limit) as any[];

    return rows.map((row) => ({
      id: row.id,
      sourceThreadId: row.source_thread_id,
      targetThreadId: row.target_thread_id,
      edgeType: row.edge_type,
      weight: row.weight,
      evidence: parseJsonRecord(row.evidence),
    }));
  }

  createIngestRun(sourceRoot: string, metadata: Record<string, unknown> = {}): string {
    const id = randomUUID();
    const now = nowIso();

    this.db
      .prepare(`
        INSERT INTO ingest_runs (
          id,
          source_root,
          status,
          started_at,
          metadata
        ) VALUES (?, ?, 'running', ?, ?)
      `)
      .run(id, sourceRoot, now, JSON.stringify(metadata));

    return id;
  }

  completeIngestRun(
    runId: string,
    status: 'completed' | 'failed',
    counts: IngestRunCounts,
    options: { policyReportPath?: string; metadata?: Record<string, unknown> } = {},
  ): void {
    this.db
      .prepare(`
        UPDATE ingest_runs
        SET
          status = ?,
          files_scanned = ?,
          files_ingested = ?,
          files_quarantined = ?,
          chats_ingested = ?,
          turns_ingested = ?,
          policy_report_path = ?,
          completed_at = ?,
          metadata = ?
        WHERE id = ?
      `)
      .run(
        status,
        counts.filesScanned,
        counts.filesIngested,
        counts.filesQuarantined,
        counts.chatsIngested,
        counts.turnsIngested,
        options.policyReportPath ?? null,
        nowIso(),
        JSON.stringify(options.metadata ?? {}),
        runId,
      );
  }

  getIngestRun(runId: string): UniverseIngestRun | undefined {
    const row = this.db.prepare('SELECT * FROM ingest_runs WHERE id = ?').get(runId) as any | undefined;
    if (!row) return undefined;

    return {
      id: row.id,
      sourceRoot: row.source_root,
      status: row.status,
      filesScanned: row.files_scanned,
      filesIngested: row.files_ingested,
      filesQuarantined: row.files_quarantined,
      chatsIngested: row.chats_ingested,
      turnsIngested: row.turns_ingested,
      policyReportPath: row.policy_report_path ?? undefined,
      startedAt: row.started_at,
      completedAt: row.completed_at ?? undefined,
      metadata: parseJsonRecord(row.metadata),
    };
  }

  reindexUniverse(): {
    threadsIndexed: number;
    turnsIndexed: number;
    termsIndexed: number;
    occurrencesIndexed: number;
    networkEdgesIndexed: number;
  } {
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM term_occurrences').run();
      this.db.prepare('DELETE FROM thematic_edges').run();
      this.db.prepare('DELETE FROM term_lexicon').run();

      const threads = this.db
        .prepare('SELECT id, provider_ref_id FROM chat_threads ORDER BY COALESCE(updated_at, created_at) DESC')
        .all() as Array<{ id: string; provider_ref_id: string }>;

      for (const thread of threads) {
        this.indexThreadTerms(thread.id, thread.provider_ref_id);
        this.rebuildCooccurrenceEdgesForThread(thread.id);
      }

      const turnsIndexed = (this.db.prepare('SELECT COUNT(*) as count FROM chat_turns').get() as { count: number }).count;
      const termsIndexed = (this.db.prepare('SELECT COUNT(*) as count FROM term_lexicon').get() as { count: number }).count;
      const occurrencesIndexed = (this.db.prepare('SELECT COUNT(*) as count FROM term_occurrences').get() as { count: number }).count;
      const networkEdgesIndexed = (this.db.prepare('SELECT COUNT(*) as count FROM thematic_edges').get() as { count: number }).count;

      return {
        threadsIndexed: threads.length,
        turnsIndexed,
        termsIndexed,
        occurrencesIndexed,
        networkEdgesIndexed,
      };
    });

    return tx();
  }

  ingestNormalizedThread(input: {
    provider: ProviderId;
    providerDisplayName?: string;
    providerMetadata?: Record<string, unknown>;
    externalAccountId?: string;
    accountDisplayName?: string;
    accountEmail?: string;
    accountMetadata?: Record<string, unknown>;
    externalThreadId?: string;
    title: string;
    sourcePath: string;
    createdAt?: string;
    updatedAt?: string;
    metadata?: Record<string, unknown>;
    turns: UpsertTurnInput[];
  }): { provider: ProviderRecord; account?: ProviderAccountRecord; thread: ChatThreadRecord; turns: ChatTurnRecord[] } {
    const provider = this.upsertProvider(input.provider, input.providerDisplayName, input.providerMetadata ?? {});
    const account = input.externalAccountId
      ? this.upsertProviderAccount({
          providerRefId: provider.id,
          externalAccountId: input.externalAccountId,
          displayName: input.accountDisplayName,
          email: input.accountEmail,
          metadata: input.accountMetadata,
        })
      : undefined;

    const thread = this.upsertChatThread({
      providerRefId: provider.id,
      accountRefId: account?.id,
      externalThreadId: input.externalThreadId,
      title: input.title,
      sourcePath: input.sourcePath,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      metadata: input.metadata,
    });

    this.syncConversationBridge(thread);

    const turns = this.replaceThreadTurns(thread.id, provider.id, input.turns);
    return { provider, account, thread, turns };
  }
}
