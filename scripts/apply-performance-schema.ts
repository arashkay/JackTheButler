/**
 * Apply Phase 9 RC1 Performance Schema Changes
 *
 * This script adds new indexes and tables for performance optimization.
 * Run with: npx tsx scripts/apply-performance-schema.ts
 */

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const dbPath = process.env.DATABASE_PATH || './data/jack.db';

// Ensure directory exists
mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

console.log('Applying Phase 9 RC1 schema changes...\n');

const statements = [
  // Audit log table
  `CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY NOT NULL,
    actor_type TEXT NOT NULL,
    actor_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now')) NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_type, actor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log(resource_type, resource_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action)`,

  // Response cache table
  `CREATE TABLE IF NOT EXISTS response_cache (
    id TEXT PRIMARY KEY NOT NULL,
    query_hash TEXT NOT NULL UNIQUE,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    intent TEXT,
    hit_count INTEGER DEFAULT 0 NOT NULL,
    last_hit_at TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')) NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_response_cache_hash ON response_cache(query_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_response_cache_expires ON response_cache(expires_at)`,

  // Additional indexes for existing tables
  `CREATE INDEX IF NOT EXISTS idx_conversations_reservation ON conversations(reservation_id)`,
  `CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at)`,
];

let successCount = 0;
let skipCount = 0;

for (const sql of statements) {
  try {
    db.exec(sql);
    const action = sql.startsWith('CREATE TABLE') ? 'Created table' : 'Created index';
    const name = sql.match(/(?:TABLE|INDEX)\s+(?:IF NOT EXISTS\s+)?(\w+)/i)?.[1] || 'unknown';
    console.log(`✓ ${action}: ${name}`);
    successCount++;
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('already exists')) {
      skipCount++;
    } else {
      console.error(`✗ Failed: ${err.message}`);
    }
  }
}

console.log(`\n✓ Applied ${successCount} changes (${skipCount} already existed)`);

db.close();
