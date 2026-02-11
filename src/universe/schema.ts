import Database from 'better-sqlite3';

function hasColumn(db: Database.Database, tableName: string, columnName: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return columns.some((column) => column.name === columnName);
}

export function ensureUniverseSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS provider_accounts (
      id TEXT PRIMARY KEY,
      provider_ref_id TEXT NOT NULL,
      external_account_id TEXT,
      display_name TEXT,
      email TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (provider_ref_id) REFERENCES providers(id) ON DELETE CASCADE,
      UNIQUE(provider_ref_id, external_account_id)
    );

    CREATE TABLE IF NOT EXISTS chat_threads (
      id TEXT PRIMARY KEY,
      provider_ref_id TEXT NOT NULL,
      account_ref_id TEXT,
      external_thread_id TEXT,
      title TEXT NOT NULL,
      source_path TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (provider_ref_id) REFERENCES providers(id) ON DELETE CASCADE,
      FOREIGN KEY (account_ref_id) REFERENCES provider_accounts(id) ON DELETE SET NULL,
      UNIQUE(provider_ref_id, source_path)
    );

    CREATE TABLE IF NOT EXISTS chat_turns (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      turn_index INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT,
      pair_turn_id TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE,
      FOREIGN KEY (pair_turn_id) REFERENCES chat_turns(id) ON DELETE SET NULL,
      UNIQUE(thread_id, turn_index)
    );

    CREATE TABLE IF NOT EXISTS term_lexicon (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term TEXT NOT NULL,
      normalized_term TEXT NOT NULL UNIQUE,
      doc_freq INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS term_occurrences (
      id TEXT PRIMARY KEY,
      lexicon_id INTEGER NOT NULL,
      provider_ref_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      turn_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      context_before TEXT,
      context_after TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (lexicon_id) REFERENCES term_lexicon(id) ON DELETE CASCADE,
      FOREIGN KEY (provider_ref_id) REFERENCES providers(id) ON DELETE CASCADE,
      FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE,
      FOREIGN KEY (turn_id) REFERENCES chat_turns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS thematic_edges (
      id TEXT PRIMARY KEY,
      source_thread_id TEXT NOT NULL,
      target_thread_id TEXT NOT NULL,
      edge_type TEXT NOT NULL,
      weight REAL NOT NULL,
      evidence TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (source_thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE,
      FOREIGN KEY (target_thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE,
      UNIQUE(source_thread_id, target_thread_id, edge_type)
    );

    CREATE TABLE IF NOT EXISTS ingest_runs (
      id TEXT PRIMARY KEY,
      source_root TEXT NOT NULL,
      status TEXT NOT NULL,
      files_scanned INTEGER NOT NULL DEFAULT 0,
      files_ingested INTEGER NOT NULL DEFAULT 0,
      files_quarantined INTEGER NOT NULL DEFAULT 0,
      chats_ingested INTEGER NOT NULL DEFAULT 0,
      turns_ingested INTEGER NOT NULL DEFAULT 0,
      policy_report_path TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      metadata TEXT NOT NULL DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_providers_provider_id ON providers(provider_id);
    CREATE INDEX IF NOT EXISTS idx_provider_accounts_provider ON provider_accounts(provider_ref_id);
    CREATE INDEX IF NOT EXISTS idx_chat_threads_provider ON chat_threads(provider_ref_id);
    CREATE INDEX IF NOT EXISTS idx_chat_threads_account ON chat_threads(account_ref_id);
    CREATE INDEX IF NOT EXISTS idx_chat_turns_thread_index ON chat_turns(thread_id, turn_index);
    CREATE INDEX IF NOT EXISTS idx_chat_turns_pair ON chat_turns(pair_turn_id);
    CREATE INDEX IF NOT EXISTS idx_term_lexicon_norm ON term_lexicon(normalized_term);
    CREATE INDEX IF NOT EXISTS idx_term_occurrences_lexicon ON term_occurrences(lexicon_id);
    CREATE INDEX IF NOT EXISTS idx_term_occurrences_provider ON term_occurrences(provider_ref_id);
    CREATE INDEX IF NOT EXISTS idx_term_occurrences_thread ON term_occurrences(thread_id);
    CREATE INDEX IF NOT EXISTS idx_term_occurrences_turn ON term_occurrences(turn_id);
    CREATE INDEX IF NOT EXISTS idx_thematic_edges_source ON thematic_edges(source_thread_id, edge_type, weight DESC);
    CREATE INDEX IF NOT EXISTS idx_thematic_edges_target ON thematic_edges(target_thread_id, edge_type, weight DESC);
    CREATE INDEX IF NOT EXISTS idx_ingest_runs_started ON ingest_runs(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ingest_runs_status ON ingest_runs(status, started_at DESC);
  `);

  if (!hasColumn(db, 'conversations', 'provider_id')) {
    db.exec('ALTER TABLE conversations ADD COLUMN provider_id TEXT');
  }
  if (!hasColumn(db, 'conversations', 'provider_account_id')) {
    db.exec('ALTER TABLE conversations ADD COLUMN provider_account_id TEXT');
  }
  if (!hasColumn(db, 'conversations', 'source_path')) {
    db.exec('ALTER TABLE conversations ADD COLUMN source_path TEXT');
  }
  if (!hasColumn(db, 'conversations', 'source_type')) {
    db.exec("ALTER TABLE conversations ADD COLUMN source_type TEXT DEFAULT 'chat'");
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_conversations_provider_id ON conversations(provider_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_provider_account_id ON conversations(provider_account_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_source_path ON conversations(source_path);
  `);
}
