/**
 * Deterministic Test Fixtures
 * Fixed timestamps and predictable IDs for snapshot testing
 */

import type { AtomicUnit } from '../../src/types.js';

// Fixed base timestamp for deterministic tests
export const FIXTURE_TIMESTAMP = new Date('2024-01-01T00:00:00.000Z');

// Helper to create fixed dates offset from base
export function fixedDate(daysOffset: number = 0): Date {
  const date = new Date(FIXTURE_TIMESTAMP);
  date.setDate(date.getDate() + daysOffset);
  return date;
}

// Deterministic UUID-like IDs
export const FIXTURE_IDS = {
  unit1: 'test-unit-001-aaaa-bbbb-ccccddddeeee',
  unit2: 'test-unit-002-aaaa-bbbb-ccccddddeeee',
  unit3: 'test-unit-003-aaaa-bbbb-ccccddddeeee',
  unit4: 'test-unit-004-aaaa-bbbb-ccccddddeeee',
  unit5: 'test-unit-005-aaaa-bbbb-ccccddddeeee',
  unit6: 'test-unit-006-aaaa-bbbb-ccccddddeeee',
  unit7: 'test-unit-007-aaaa-bbbb-ccccddddeeee',
  unit8: 'test-unit-008-aaaa-bbbb-ccccddddeeee',
  unit9: 'test-unit-009-aaaa-bbbb-ccccddddeeee',
  unit10: 'test-unit-010-aaaa-bbbb-ccccddddeeee',
  conv1: 'conv-001-aaaa-bbbb-ccccddddeeee',
  conv2: 'conv-002-aaaa-bbbb-ccccddddeeee',
};

/**
 * Fixture atomic units for testing
 * All have fixed timestamps and predictable content
 */
export const FIXTURE_UNITS: AtomicUnit[] = [
  {
    id: FIXTURE_IDS.unit1,
    title: 'Understanding React Hooks',
    content: 'React Hooks are functions that let you use state and other React features without writing a class. The most commonly used hooks are useState and useEffect.',
    context: 'Discussion about modern React patterns',
    type: 'insight',
    category: 'programming',
    tags: ['react', 'hooks', 'javascript'],
    keywords: ['React', 'Hooks', 'useState', 'useEffect', 'functional'],
    timestamp: fixedDate(0),
    conversationId: FIXTURE_IDS.conv1,
    relatedUnits: [FIXTURE_IDS.unit2],
  },
  {
    id: FIXTURE_IDS.unit2,
    title: 'TypeScript Generics Example',
    content: `function identity<T>(arg: T): T {
  return arg;
}

const result = identity<string>("hello");`,
    context: 'Code example for TypeScript generics',
    type: 'code',
    category: 'programming',
    tags: ['typescript', 'generics', 'functions'],
    keywords: ['TypeScript', 'generics', 'function', 'type safety'],
    timestamp: fixedDate(1),
    conversationId: FIXTURE_IDS.conv1,
    relatedUnits: [FIXTURE_IDS.unit1, FIXTURE_IDS.unit3],
  },
  {
    id: FIXTURE_IDS.unit3,
    title: 'How to implement caching in Node.js?',
    content: 'What are the best practices for implementing caching in a Node.js application? Should I use Redis or an in-memory solution?',
    context: 'Question about performance optimization',
    type: 'question',
    category: 'programming',
    tags: ['nodejs', 'caching', 'redis', 'performance'],
    keywords: ['Node.js', 'caching', 'Redis', 'performance', 'best practices'],
    timestamp: fixedDate(2),
    conversationId: FIXTURE_IDS.conv1,
    relatedUnits: [],
  },
  {
    id: FIXTURE_IDS.unit4,
    title: 'REST API Design Guidelines',
    content: 'REST API best practices: Use nouns for resources, HTTP methods for actions, proper status codes, pagination for lists, and HATEOAS for discoverability.',
    context: 'Reference material on API design',
    type: 'reference',
    category: 'programming',
    tags: ['api', 'rest', 'design', 'http'],
    keywords: ['REST', 'API', 'HTTP', 'design', 'best practices'],
    timestamp: fixedDate(3),
    conversationId: FIXTURE_IDS.conv2,
    relatedUnits: [],
  },
  {
    id: FIXTURE_IDS.unit5,
    title: 'Chose PostgreSQL over MongoDB',
    content: 'Decision: Use PostgreSQL for the project because we need ACID transactions, complex queries, and relational data modeling. MongoDB would be better for document storage but our use case is relational.',
    context: 'Architecture decision for database selection',
    type: 'decision',
    category: 'design',
    tags: ['database', 'postgresql', 'mongodb', 'architecture'],
    keywords: ['PostgreSQL', 'MongoDB', 'database', 'ACID', 'architecture'],
    timestamp: fixedDate(4),
    conversationId: FIXTURE_IDS.conv2,
    relatedUnits: [],
  },
  {
    id: FIXTURE_IDS.unit6,
    title: 'Writing Effective Documentation',
    content: 'Good documentation should be clear, concise, and include examples. Always consider your audience and their level of expertise.',
    context: 'Best practices for technical writing',
    type: 'insight',
    category: 'writing',
    tags: ['documentation', 'writing', 'best-practices'],
    keywords: ['documentation', 'writing', 'clarity', 'examples'],
    timestamp: fixedDate(5),
    conversationId: FIXTURE_IDS.conv2,
    relatedUnits: [],
  },
  {
    id: FIXTURE_IDS.unit7,
    title: 'Research on Vector Databases',
    content: 'Vector databases like Pinecone, Weaviate, and ChromaDB are optimized for similarity search using embeddings. They excel at semantic search, recommendations, and RAG applications.',
    context: 'Research notes on vector database options',
    type: 'reference',
    category: 'research',
    tags: ['vector-db', 'embeddings', 'search', 'ai'],
    keywords: ['vector database', 'embeddings', 'Pinecone', 'Weaviate', 'ChromaDB'],
    timestamp: fixedDate(6),
    conversationId: FIXTURE_IDS.conv2,
    relatedUnits: [FIXTURE_IDS.unit3],
  },
  {
    id: FIXTURE_IDS.unit8,
    title: 'UI Color Palette Selection',
    content: 'Selected a warm neutral palette: primary #e76f51, secondary #2a9d8f, background #f4f0e8, text #1f2933. Provides good contrast and accessibility.',
    context: 'Design decision for the application UI',
    type: 'decision',
    category: 'design',
    tags: ['ui', 'colors', 'design-system', 'accessibility'],
    keywords: ['UI', 'color palette', 'design', 'accessibility', 'contrast'],
    timestamp: fixedDate(7),
    conversationId: FIXTURE_IDS.conv2,
    relatedUnits: [],
  },
  {
    id: FIXTURE_IDS.unit9,
    title: 'General Notes on Project Management',
    content: 'Key principles: break work into small tasks, maintain clear communication, track progress regularly, and adapt to changing requirements.',
    context: 'General advice on managing software projects',
    type: 'insight',
    category: 'general',
    tags: ['project-management', 'agile', 'communication'],
    keywords: ['project management', 'tasks', 'communication', 'agile'],
    timestamp: fixedDate(8),
    conversationId: FIXTURE_IDS.conv2,
    relatedUnits: [],
  },
  {
    id: FIXTURE_IDS.unit10,
    title: 'SQL Query Optimization',
    content: `-- Use indexes for frequently queried columns
CREATE INDEX idx_units_type ON atomic_units(type);
CREATE INDEX idx_units_category ON atomic_units(category);

-- Use EXPLAIN ANALYZE to check query plans
EXPLAIN ANALYZE SELECT * FROM atomic_units WHERE type = 'insight';`,
    context: 'Code example for database optimization',
    type: 'code',
    category: 'programming',
    tags: ['sql', 'database', 'optimization', 'indexes'],
    keywords: ['SQL', 'index', 'optimization', 'EXPLAIN', 'query'],
    timestamp: fixedDate(9),
    conversationId: FIXTURE_IDS.conv1,
    relatedUnits: [FIXTURE_IDS.unit5],
  },
];

/**
 * Get units sorted by ID for deterministic snapshot testing
 */
export function getSortedUnits(): AtomicUnit[] {
  return [...FIXTURE_UNITS].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Get units by type
 */
export function getUnitsByType(type: AtomicUnit['type']): AtomicUnit[] {
  return FIXTURE_UNITS.filter((u) => u.type === type);
}

/**
 * Get units by category
 */
export function getUnitsByCategory(category: AtomicUnit['category']): AtomicUnit[] {
  return FIXTURE_UNITS.filter((u) => u.category === category);
}

/**
 * Get units with a specific tag
 */
export function getUnitsWithTag(tag: string): AtomicUnit[] {
  return FIXTURE_UNITS.filter((u) => u.tags.includes(tag));
}

/**
 * Create a minimal unit for testing
 */
export function createMinimalUnit(overrides: Partial<AtomicUnit> = {}): AtomicUnit {
  return {
    id: 'test-minimal-unit',
    title: 'Minimal Test Unit',
    content: 'Minimal content for testing',
    context: '',
    type: 'insight',
    category: 'general',
    tags: [],
    keywords: [],
    timestamp: FIXTURE_TIMESTAMP,
    ...overrides,
  };
}

/**
 * Fixture conversations
 */
export const FIXTURE_CONVERSATIONS = [
  {
    id: FIXTURE_IDS.conv1,
    title: 'Programming Best Practices Discussion',
    source: 'claude',
    unitCount: 4,
    timestamp: FIXTURE_TIMESTAMP,
  },
  {
    id: FIXTURE_IDS.conv2,
    title: 'Architecture and Design Decisions',
    source: 'claude',
    unitCount: 6,
    timestamp: fixedDate(3),
  },
];

/**
 * Fixture tags with counts
 */
export const FIXTURE_TAGS = [
  { name: 'programming', count: 4 },
  { name: 'typescript', count: 1 },
  { name: 'react', count: 1 },
  { name: 'nodejs', count: 1 },
  { name: 'database', count: 2 },
  { name: 'design', count: 2 },
  { name: 'api', count: 1 },
  { name: 'documentation', count: 1 },
  { name: 'ai', count: 1 },
];
