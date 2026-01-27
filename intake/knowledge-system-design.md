# Personal Knowledge Database System
**Design Document - Token-Optimized Claude Conversation Export & Archive**

## 🎯 System Overview

A hybrid local/cloud system that:
1. Optimizes Claude API token usage
2. Exports conversations from claude.app/web
3. Atomizes conversations into meaningful knowledge units
4. Archives in multiple formats (Markdown, JSON, SQLite, Vector DB)
5. Enables semantic search and retrieval

---

## 1. Token Optimization Strategy

### 1.1 Request-Level Optimization

#### Prompt Caching (Primary Strategy)
```typescript
// Leverage Claude's prompt caching for repeated context
interface CachedPromptStrategy {
  systemPrompt: string;      // Cached (5min TTL)
  projectContext: string;    // Cached (5min TTL)
  conversationHistory: Message[]; // Sliding window
  currentQuery: string;      // Never cached
}

// Token savings: ~90% on cached portions
// Cost: First request full price, subsequent requests 90% cheaper
```

#### Context Windowing
```typescript
interface ContextWindow {
  maxTokens: 200000;

  // Intelligent summarization when approaching limit
  summarizeOldMessages: (messages: Message[], threshold: number) => Message[];

  // Keep recent context verbatim, summarize older
  strategy: 'sliding-window-with-summary';

  // Retain critical messages (marked with importance)
  pinnedMessages: Message[];
}
```

#### Request Batching & Deduplication
```typescript
// Batch similar queries
interface RequestBatcher {
  // Combine multiple small requests into one
  batchQueries: (queries: string[]) => BatchedRequest;

  // Cache identical or similar requests
  deduplicateCache: Map<string, CachedResponse>;

  // Fuzzy matching for near-identical queries
  similarityThreshold: 0.95;
}
```

### 1.2 Response Optimization

```typescript
// Request only what you need
interface ResponseControl {
  // Use streaming for long responses
  streaming: true;

  // Stop generation early if answer found
  stopSequences: string[];

  // Request structured output to reduce verbosity
  outputFormat: 'json' | 'markdown' | 'concise';

  // Temperature control for deterministic caching
  temperature: 0; // Identical inputs → identical outputs → better caching
}
```

### 1.3 Cost Tracking
```typescript
interface TokenTracker {
  requestTokens: number;
  responseTokens: number;
  cachedTokens: number;
  totalCost: number;

  // Per-conversation analytics
  metrics: {
    averageRequestSize: number;
    cacheHitRate: number;
    costPerInsight: number;
  }
}
```

---

## 2. Claude.app/Web Export Strategy

### 2.1 Export Methods

#### Method A: Browser Automation (Recommended)
```typescript
// Use Playwright to export conversations
interface BrowserExporter {
  // Navigate to claude.app
  login: () => Promise<void>;

  // List all conversations
  listConversations: () => Promise<Conversation[]>;

  // Export each conversation
  exportConversation: (id: string) => Promise<{
    id: string;
    title: string;
    created: Date;
    messages: Message[];
    artifacts: Artifact[];
  }>;

  // Download attachments/artifacts
  downloadArtifacts: (conversation: Conversation) => Promise<File[]>;
}
```

#### Method B: API Integration (If Available)
```typescript
// If Anthropic provides API access to conversations
interface ClaudeAPIExporter {
  // Fetch conversations via API
  getConversations: (options: PaginationOptions) => Promise<Conversation[]>;

  // More reliable than browser scraping
  // Faster and less brittle
}
```

#### Method C: Manual Export
```typescript
// User-initiated export
// Claude.app may have export functionality
// Check: Settings → Export Data → Download JSON
```

### 2.2 Export Schedule
```typescript
interface ExportScheduler {
  // Incremental exports (only new/updated conversations)
  mode: 'incremental';

  // Run daily at low-traffic time
  schedule: '0 2 * * *'; // 2 AM daily

  // Track last export timestamp
  lastExport: Date;

  // Deduplication by conversation ID
  exportedConversations: Set<string>;
}
```

---

## 3. Atomization Process

### 3.1 Conversation Parsing

```typescript
interface ConversationAtomizer {
  // Parse conversation into atomic units
  atomize: (conversation: Conversation) => AtomicUnit[];
}

interface AtomicUnit {
  id: string;              // UUID
  type: 'insight' | 'code' | 'question' | 'reference' | 'decision';
  timestamp: Date;

  // Content
  title: string;           // Auto-generated or extracted
  content: string;         // The atomic piece of knowledge
  context: string;         // Surrounding conversation context

  // Metadata
  tags: string[];          // Auto-extracted + manual
  category: string;        // Programming, writing, research, etc.

  // Relationships
  conversationId: string;
  parentMessage: string;
  relatedUnits: string[];  // Links to related atomic units

  // Search
  embedding?: number[];    // Vector embedding for semantic search
  keywords: string[];      // Extracted keywords
}
```

### 3.2 Atomization Strategies

```typescript
// Strategy 1: Message-level atomization
const atomizeByMessage = (conversation: Conversation): AtomicUnit[] => {
  return conversation.messages.map(msg => ({
    type: inferType(msg),
    content: msg.content,
    // ... metadata
  }));
};

// Strategy 2: Insight extraction
const atomizeByInsight = (conversation: Conversation): AtomicUnit[] => {
  // Use Claude to extract key insights from conversation
  const insights = await extractInsights(conversation);
  return insights.map(createAtomicUnit);
};

// Strategy 3: Code artifacts
const atomizeCodeArtifacts = (conversation: Conversation): AtomicUnit[] => {
  return conversation.artifacts
    .filter(a => a.type === 'code')
    .map(code => ({
      type: 'code',
      content: code.content,
      tags: [code.language, 'code', ...extractTags(code)],
    }));
};

// Strategy 4: Semantic chunking
const atomizeBySemanticChunks = (conversation: Conversation): AtomicUnit[] => {
  // Split into coherent semantic units (similar to RAG chunking)
  const chunks = semanticChunker(conversation.fullText, {
    maxTokens: 512,
    overlapTokens: 50,
    splitOn: 'topic-change'
  });
  return chunks.map(createAtomicUnit);
};
```

### 3.3 Automatic Tagging & Categorization

```typescript
interface AutoTagger {
  // Extract tags from content
  extractTags: (content: string) => string[];

  // Categorize using Claude
  categorize: (unit: AtomicUnit) => Promise<{
    category: string;
    subcategories: string[];
    confidence: number;
  }>;

  // Link related units
  findRelated: (unit: AtomicUnit, allUnits: AtomicUnit[]) => string[];
}
```

---

## 4. Multi-Format Archive System

### 4.1 Storage Architecture

```
~/knowledge-base/
├── raw/                          # Original exports
│   ├── claude-app/
│   │   ├── 2025-01-15/
│   │   │   ├── conversation-abc123.json
│   │   │   └── conversation-def456.json
│   │   └── latest.json
│   └── metadata.db
│
├── atomized/                     # Processed atomic units
│   ├── markdown/                 # Human-readable
│   │   ├── 2025-01/
│   │   │   ├── oauth-implementation.md
│   │   │   ├── token-optimization.md
│   │   │   └── index.md
│   │   └── tags/
│   │       ├── programming.md
│   │       ├── typescript.md
│   │       └── oauth.md
│   │
│   ├── json/                     # Machine-readable
│   │   ├── units/
│   │   │   ├── unit-uuid1.json
│   │   │   └── unit-uuid2.json
│   │   └── index.jsonl          # Newline-delimited for streaming
│   │
│   └── embeddings/               # Vector database
│       ├── chroma/               # ChromaDB collection
│       └── metadata.json
│
├── db/                           # SQLite database
│   └── knowledge.db
│
└── sync/                         # Cloud sync staging
    ├── .git/                     # Git for version control
    └── .sync-config.json         # Sync configuration
```

### 4.2 Markdown Format

```markdown
---
id: uuid-here
type: insight
created: 2025-01-15T10:30:00Z
conversation: conversation-abc123
tags: [oauth, typescript, authentication]
category: programming
---

# OAuth Implementation Strategy

## Context
Working on adding OAuth2 authentication to cloudbase-mcp project.

## Insight
Passport.js provides a clean abstraction for OAuth2 flows, separating:
- Strategy configuration (client ID, secret, endpoints)
- Route handling (login, callback)
- Session management

## Code Reference
See `/Users/4jp/cloudbase-mcp/oauth-strategy.ts`

## Related
- [[CSRF Protection]]
- [[Session Management]]
- [[Token Refresh Strategies]]

---
*Source: Claude Code CLI - Conversation abc123*
```

### 4.3 JSON Format

```json
{
  "id": "uuid-here",
  "type": "insight",
  "created": "2025-01-15T10:30:00Z",
  "conversation": {
    "id": "conversation-abc123",
    "title": "OAuth Implementation",
    "url": "https://claude.app/chat/abc123"
  },
  "content": {
    "title": "OAuth Implementation Strategy",
    "body": "Passport.js provides a clean abstraction...",
    "context": "Previous 3 messages discussing authentication options"
  },
  "metadata": {
    "tags": ["oauth", "typescript", "authentication"],
    "category": "programming",
    "keywords": ["passport", "oauth2", "strategy", "session"],
    "language": "en",
    "codeLanguages": ["typescript"]
  },
  "relationships": {
    "related": ["uuid-csrf", "uuid-session"],
    "references": ["/Users/4jp/cloudbase-mcp/oauth-strategy.ts"]
  },
  "search": {
    "embedding": [0.123, -0.456, ...],
    "summary": "Guide to implementing OAuth2 with Passport.js"
  }
}
```

### 4.4 SQLite Schema

```sql
-- Main units table
CREATE TABLE atomic_units (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    created TIMESTAMP NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    context TEXT,
    conversation_id TEXT,
    category TEXT,
    embedding BLOB -- Serialized vector
);

-- Full-text search
CREATE VIRTUAL TABLE units_fts USING fts5(
    title, content, context, tags,
    content=atomic_units,
    content_rowid=rowid
);

-- Tags (many-to-many)
CREATE TABLE tags (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE unit_tags (
    unit_id TEXT,
    tag_id INTEGER,
    FOREIGN KEY (unit_id) REFERENCES atomic_units(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id),
    PRIMARY KEY (unit_id, tag_id)
);

-- Relationships
CREATE TABLE unit_relationships (
    from_unit TEXT,
    to_unit TEXT,
    relationship_type TEXT, -- 'related', 'references', 'parent', 'child'
    FOREIGN KEY (from_unit) REFERENCES atomic_units(id),
    FOREIGN KEY (to_unit) REFERENCES atomic_units(id),
    PRIMARY KEY (from_unit, to_unit, relationship_type)
);

-- Conversations
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    title TEXT,
    created TIMESTAMP,
    url TEXT,
    exported_at TIMESTAMP
);

-- Search & analytics
CREATE INDEX idx_units_created ON atomic_units(created);
CREATE INDEX idx_units_category ON atomic_units(category);
CREATE INDEX idx_units_type ON atomic_units(type);
```

### 4.5 Vector Database (ChromaDB)

```python
# Vector database for semantic search
import chromadb
from chromadb.config import Settings

# Initialize
client = chromadb.PersistentClient(
    path="/Users/4jp/knowledge-base/atomized/embeddings/chroma"
)

collection = client.create_collection(
    name="knowledge_units",
    metadata={
        "description": "Atomized knowledge from Claude conversations",
        "embedding_model": "text-embedding-3-small"
    }
)

# Add units
collection.add(
    ids=["uuid1", "uuid2"],
    embeddings=[[0.1, 0.2, ...], [0.3, 0.4, ...]],
    metadatas=[
        {"type": "insight", "tags": ["oauth"], "category": "programming"},
        {"type": "code", "tags": ["typescript"], "category": "programming"}
    ],
    documents=[
        "OAuth implementation using Passport.js...",
        "TypeScript interface for OAuth configuration..."
    ]
)

# Semantic search
results = collection.query(
    query_texts=["How do I implement OAuth?"],
    n_results=10,
    where={"category": "programming"}
)
```

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up directory structure
- [ ] Create SQLite database schema
- [ ] Implement basic export from claude.app (Playwright)
- [ ] Create simple atomization (message-level)

### Phase 2: Multi-Format Storage (Week 2)
- [ ] Markdown generator with frontmatter
- [ ] JSON/JSONL export
- [ ] SQLite integration
- [ ] ChromaDB vector storage

### Phase 3: Intelligence Layer (Week 3)
- [ ] Implement prompt caching optimization
- [ ] Auto-tagging with Claude
- [ ] Semantic chunking
- [ ] Relationship detection

### Phase 4: Search & Retrieval (Week 4)
- [ ] Full-text search (SQLite FTS5)
- [ ] Semantic search (vector similarity)
- [ ] Tag-based browsing
- [ ] Web interface (optional)

### Phase 5: Hybrid Sync (Week 5)
- [ ] Git integration for markdown files
- [ ] Cloud sync (Dropbox/iCloud/Git)
- [ ] Incremental updates
- [ ] Conflict resolution

---

## 6. Token Optimization Implementation

### 6.1 Caching Service

```typescript
// Token-optimized Claude API client
import Anthropic from '@anthropic-ai/sdk';

interface CachedClaudeClient {
  client: Anthropic;
  cache: Map<string, {response: string, timestamp: number}>;

  // Smart request with caching
  async chat(options: {
    systemPrompt: string;     // Will be cached
    context: string;          // Will be cached
    query: string;            // Never cached
    useCache: boolean;
  }): Promise<string> {
    const cacheKey = hashPrompt(options.systemPrompt + options.context);

    // Check cache first
    if (options.useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5min
        // Use cached context
        return this.queryWithCachedContext(cached, options.query);
      }
    }

    // Full request with prompt caching
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: options.systemPrompt,
          cache_control: { type: 'ephemeral' }
        },
        {
          type: 'text',
          text: options.context,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: [{ role: 'user', content: options.query }],
    });

    // Track tokens
    this.trackTokens(response.usage);

    return response.content[0].text;
  }

  // Token tracking
  trackTokens(usage: any) {
    console.log(`
      Input: ${usage.input_tokens}
      Output: ${usage.output_tokens}
      Cached: ${usage.cache_read_input_tokens || 0}
      Cache writes: ${usage.cache_creation_input_tokens || 0}

      Cost savings: ${this.calculateSavings(usage)}
    `);
  }
}
```

### 6.2 Context Window Manager

```typescript
interface ContextManager {
  maxTokens: 200000;
  currentTokens: number;

  // Intelligent pruning
  pruneContext(messages: Message[]): Message[] {
    // Keep first message (often contains important context)
    // Keep last N messages verbatim
    // Summarize middle messages

    const keep = 10; // Last 10 messages
    const recent = messages.slice(-keep);
    const old = messages.slice(0, -keep);

    if (old.length === 0) return recent;

    // Summarize old messages
    const summary = this.summarize(old);

    return [summary, ...recent];
  }

  async summarize(messages: Message[]): Promise<Message> {
    // Use Claude to summarize old messages
    const summary = await claude.chat({
      query: `Summarize these messages concisely, preserving key decisions and insights:\n${JSON.stringify(messages)}`,
      useCache: false,
    });

    return {
      role: 'assistant',
      content: `[SUMMARY OF ${messages.length} MESSAGES]\n${summary}`,
    };
  }
}
```

---

## 7. Query & Retrieval Interface

```typescript
// Unified search across all formats
interface KnowledgeQuery {
  // Full-text search
  searchText(query: string): Promise<AtomicUnit[]>;

  // Semantic search
  searchSemantic(query: string, limit?: number): Promise<AtomicUnit[]>;

  // Tag-based
  searchTags(tags: string[]): Promise<AtomicUnit[]>;

  // Combined
  searchHybrid(options: {
    text?: string;
    semantic?: string;
    tags?: string[];
    category?: string;
    dateRange?: [Date, Date];
  }): Promise<AtomicUnit[]>;
}

// Example usage
const kb = new KnowledgeBase('/Users/4jp/knowledge-base');

// Find OAuth-related insights
const results = await kb.searchHybrid({
  text: 'OAuth implementation',
  tags: ['typescript', 'authentication'],
  category: 'programming'
});

// Semantic search
const similar = await kb.searchSemantic(
  'How do I handle token refresh in OAuth flows?'
);
```

---

## 8. Cost Analysis

### Token Savings with Prompt Caching

```
Scenario: Processing 100 conversations (avg 10k tokens each)

WITHOUT caching:
- Total input tokens: 1,000,000
- Cost: $3.00 (at $3/MTok)

WITH prompt caching:
- First request: 10,000 tokens ($0.03)
- Subsequent 99 requests:
  - Cache writes: 8,000 tokens ($0.024)
  - Cache reads: 99 × 8,000 = 792,000 tokens ($0.79)
  - New tokens: 99 × 2,000 = 198,000 tokens ($0.59)
- Total cost: $1.44

SAVINGS: 52% ($1.56 saved)

For large-scale knowledge extraction, this compounds significantly.
```

---

## 9. Next Steps

1. **Immediate**: Review this design and confirm approach
2. **Build MVP**: Start with Phase 1 (export + basic atomization)
3. **Iterate**: Add intelligence and multi-format storage
4. **Deploy**: Set up hybrid sync and automated exports

---

## 10. Tech Stack

```json
{
  "core": {
    "runtime": "Node.js + TypeScript",
    "apiClient": "@anthropic-ai/sdk",
    "browserAutomation": "playwright"
  },
  "storage": {
    "markdown": "gray-matter + remark",
    "database": "better-sqlite3",
    "vectorDB": "chromadb",
    "filesystem": "fs-extra"
  },
  "processing": {
    "embeddings": "openai (text-embedding-3-small)",
    "chunking": "langchain text-splitter",
    "tagging": "claude-sonnet-4"
  },
  "sync": {
    "git": "simple-git",
    "cloud": "rclone or native sync"
  },
  "search": {
    "fts": "SQLite FTS5",
    "vector": "ChromaDB similarity",
    "hybrid": "RRF (Reciprocal Rank Fusion)"
  }
}
```

---

**Ready to implement?** This design gives you a powerful, token-efficient knowledge system.
