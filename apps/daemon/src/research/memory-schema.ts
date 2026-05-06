// Memory subsystem — research starter (not wired into server.ts).
//
// Source: docs/research/openwork-aionui-alaude-integration.md §5.1.A
// Inspired by Labaik renderer/js/memory/* (layered: profile + episodic + recall + incognito)
// and AionUi src/process/agent/gemini/index.ts (refreshServerHierarchicalMemory delegation).
//
// Open Design twist: project + conversation two-tier scope, SQLite-native,
// shared across all agent adapters via system-prompt prefix injection on the
// last user message (NOT role:'system' — Anthropic API constraint, see Labaik
// memory-recall.js#injectIntoLastUser).

import type { Database } from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

export type MemoryScope = 'project' | 'conversation' | 'global';
export type MemoryKind = 'fact' | 'preference' | 'decision' | 'todo' | 'link';
export type MemorySource = 'user_pin' | 'agent_save' | 'auto_summary';

export interface MemoryEntry {
  id: string;
  scope: MemoryScope;
  scopeId: string | null;
  kind: MemoryKind;
  content: string;
  source: MemorySource;
  sourceMessageId: string | null;
  sourceAgent: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  expiresAt: number | null;
  archived: boolean;
}

export const MEMORIES_DDL = `
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  scope_id TEXT,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  source_message_id TEXT,
  source_agent TEXT,
  tags TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER,
  archived INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_memories_scope ON memories(scope, scope_id, archived);
CREATE INDEX IF NOT EXISTS idx_memories_kind ON memories(kind);
`;

export function ensureMemoriesTable(db: Database): void {
  db.exec(MEMORIES_DDL);
}

interface CreateMemoryInput {
  scope: MemoryScope;
  scopeId?: string | null;
  kind: MemoryKind;
  content: string;
  source: MemorySource;
  sourceMessageId?: string | null;
  sourceAgent?: string | null;
  tags?: string[];
  expiresAt?: number | null;
}

export function createMemory(db: Database, input: CreateMemoryInput): MemoryEntry {
  const now = Date.now();
  const id = randomUUID();
  const tags = input.tags ?? [];
  db.prepare(
    `INSERT INTO memories (
       id, scope, scope_id, kind, content, source,
       source_message_id, source_agent, tags,
       created_at, updated_at, expires_at, archived
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
  ).run(
    id,
    input.scope,
    input.scopeId ?? null,
    input.kind,
    input.content,
    input.source,
    input.sourceMessageId ?? null,
    input.sourceAgent ?? null,
    JSON.stringify(tags),
    now,
    now,
    input.expiresAt ?? null,
  );
  return {
    id,
    scope: input.scope,
    scopeId: input.scopeId ?? null,
    kind: input.kind,
    content: input.content,
    source: input.source,
    sourceMessageId: input.sourceMessageId ?? null,
    sourceAgent: input.sourceAgent ?? null,
    tags,
    createdAt: now,
    updatedAt: now,
    expiresAt: input.expiresAt ?? null,
    archived: false,
  };
}

interface ListMemoriesOptions {
  projectId: string;
  conversationId?: string | null;
  includeArchived?: boolean;
  limit?: number;
}

interface MemoryRow {
  id: string;
  scope: MemoryScope;
  scope_id: string | null;
  kind: MemoryKind;
  content: string;
  source: MemorySource;
  source_message_id: string | null;
  source_agent: string | null;
  tags: string | null;
  created_at: number;
  updated_at: number;
  expires_at: number | null;
  archived: number;
}

function rowToEntry(row: MemoryRow): MemoryEntry {
  return {
    id: row.id,
    scope: row.scope,
    scopeId: row.scope_id,
    kind: row.kind,
    content: row.content,
    source: row.source,
    sourceMessageId: row.source_message_id,
    sourceAgent: row.source_agent,
    tags: row.tags ? (JSON.parse(row.tags) as string[]) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    archived: row.archived === 1,
  };
}

export function listMemoriesForContext(
  db: Database,
  opts: ListMemoriesOptions,
): MemoryEntry[] {
  const limit = opts.limit ?? 50;
  const archivedClause = opts.includeArchived ? '' : 'AND archived = 0';
  const now = Date.now();
  const params: unknown[] = [opts.projectId];
  let conversationFilter = '';
  if (opts.conversationId) {
    conversationFilter = `OR (scope = 'conversation' AND scope_id = ?)`;
    params.push(opts.conversationId);
  }
  const rows = db
    .prepare<unknown[], MemoryRow>(
      `SELECT * FROM memories
       WHERE (expires_at IS NULL OR expires_at > ${now})
         AND (
           (scope = 'project' AND scope_id = ?)
           ${conversationFilter}
           OR scope = 'global'
         )
         ${archivedClause}
       ORDER BY updated_at DESC
       LIMIT ${limit}`,
    )
    .all(...params);
  return rows.map(rowToEntry);
}

/**
 * Build the <memory> block to prefix on the last user message.
 *
 * Why prefix-on-last-user-message instead of role:'system':
 *   1. Anthropic Messages API does not allow `system` entries in messages[];
 *      they go to the top-level `system` field. Provider-agnostic injection
 *      is simpler if we always shape it as plain text in the user turn.
 *   2. AionUi's `refreshServerHierarchicalMemory` works because Gemini CLI
 *      owns the prompt assembly. Open Design owns it, so we choose a shape
 *      that survives across all adapters.
 *
 * Source: Labaik renderer/js/memory/memory-recall.js#injectIntoLastUser
 */
export function buildMemoryPrefix(entries: MemoryEntry[]): string {
  if (entries.length === 0) return '';
  const lines = entries.map((e) => {
    const tags = e.tags.length > 0 ? ` [${e.tags.join(', ')}]` : '';
    return `- (${e.kind}${tags}) ${e.content}`;
  });
  return [
    '<memory>',
    'The user has saved the following project / conversation memory.',
    'Treat it as authoritative context. Do not repeat it back unless asked.',
    ...lines,
    '</memory>',
    '',
  ].join('\n');
}

export function archiveMemory(db: Database, id: string): void {
  db.prepare(`UPDATE memories SET archived = 1, updated_at = ? WHERE id = ?`).run(
    Date.now(),
    id,
  );
}

export function updateMemoryContent(db: Database, id: string, content: string): void {
  db.prepare(`UPDATE memories SET content = ?, updated_at = ? WHERE id = ?`).run(
    content,
    Date.now(),
    id,
  );
}
