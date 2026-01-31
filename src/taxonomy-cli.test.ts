import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { KnowledgeDatabase } from './database.js';
import { execSync } from 'child_process';
import { AtomicUnit } from './types.js';

const TEST_DIR = join(process.cwd(), '.test-tmp', 'taxonomy-cli');
const TEST_DB = join(TEST_DIR, 'test.db');

function createUnit(db: KnowledgeDatabase, id: string, category: string, tags: string[]) {
  const now = new Date();
  const unit: AtomicUnit = {
    id,
    type: 'insight',
    timestamp: now,
    title: `Unit ${id}`,
    content: 'Content',
    context: '',
    tags,
    category: category as any, // Bypass type check for test
    relatedUnits: [],
    keywords: [],
    conversationId: undefined,
    documentId: undefined
  };
  
  db.insertAtomicUnit(unit);
}

describe('Taxonomy CLI', () => {
  let db: KnowledgeDatabase;

  beforeEach(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
    if (existsSync(TEST_DB)) {
      rmSync(TEST_DB, { force: true });
    }
    db = new KnowledgeDatabase(TEST_DB);
  });

  afterEach(() => {
    db.close();
    if (existsSync(TEST_DB)) {
      rmSync(TEST_DB, { force: true });
    }
  });

  it('detects invalid categories and tags in audit mode', () => {
    createUnit(db, 'u1', 'Technical', ['React JS', 'Node.js']);

    const row = (db as any).db.prepare('SELECT category FROM atomic_units WHERE id = ?').get('u1');
    console.log('DEBUG DB Category:', row);
    
    try {
        const output = execSync(`tsx src/taxonomy-cli.ts audit`, { 
            env: { ...process.env, DB_PATH: TEST_DB },
            encoding: 'utf-8'
        });
        
        expect(output).toContain('Technical');
        expect(output).toContain('React JS');
        expect(output).toContain('Suggest: "programming"');
        expect(output).toContain('Suggest: "react-js"');
    } catch (e) {
        console.error((e as any).stdout);
        throw e;
    }
  });
  
  it('repairs categories and tags in repair mode', () => {
    createUnit(db, 'u1', 'Technical', ['React JS']);
    
    const output = execSync(`tsx src/taxonomy-cli.ts repair --save --yes`, { 
        env: { ...process.env, DB_PATH: TEST_DB },
        encoding: 'utf-8'
    });
    
    // Verify category changes (implemented)
    const unit = db.getUnitById('u1');
    expect(unit?.category).toBe('programming');
    
    // Verify tag warning (not implemented yet)
    expect(output).toContain('Tag repair not fully implemented');
  });
});