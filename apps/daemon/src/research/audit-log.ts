// Audit log per project — research starter (not wired into server.ts).
//
// Source: docs/research/openwork-aionui-alaude-integration.md §5.2 (P1-1)
// Inspired by openwork apps/server/src/audit.ts: append-only JSONL,
// `OPENWORK_DATA_DIR` overridable, `GET /workspace/:id/audit?limit=25`.
//
// Open Design twist: per-project file under `.od/projects/<id>/audit.jsonl`
// (alongside the project's plain artifact files), so that an exported project
// folder carries its own audit history.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

export type AuditAction =
  | 'project.create'
  | 'project.update'
  | 'project.delete'
  | 'conversation.create'
  | 'conversation.delete'
  | 'message.send'
  | 'message.delete'
  | 'skill.set'
  | 'design_system.set'
  | 'craft.toggle'
  | 'file.write'
  | 'file.delete'
  | 'memory.create'
  | 'memory.archive'
  | 'memory.update'
  | 'deploy.start'
  | 'deploy.complete'
  | 'export.bundle'
  | 'import.bundle'
  | 'agent.spawn'
  | 'agent.cancel';

export interface AuditEntry {
  timestamp: number;          // ms epoch
  projectId: string;
  conversationId?: string;
  action: AuditAction;
  actor: 'user' | 'agent' | 'system';
  agentId?: string;           // when actor === 'agent'
  detail?: Record<string, unknown>;
}

interface AuditOptions {
  projectRoot: string;        // open-design project root (where `.od/` lives)
  dataDir?: string;           // OD_DATA_DIR override
}

// Mirrors `isSafeId` in apps/daemon/src/projects.ts. Inlined to keep this
// research starter free of imports from server-internal modules; the planned
// `GET /api/projects/:id/audit` route will take `:id` from a URL parameter,
// so this guard must run before any path join / mkdirSync.
function isSafeProjectId(id: string): boolean {
  return typeof id === 'string' && /^[A-Za-z0-9._-]{1,128}$/.test(id);
}

interface ResolvedAuditPath {
  dir: string;
  file: string;
}

/**
 * Resolve the audit directory and file for a project. Pure function: does
 * NOT touch the filesystem (no mkdir, no stat). Read paths must use this
 * directly so simply querying the audit log can never create directories
 * outside the project tree (PR #617 review, P1).
 */
function resolveAuditPath(projectId: string, opts: AuditOptions): ResolvedAuditPath {
  if (!isSafeProjectId(projectId)) throw new Error('invalid project id');
  const root = opts.dataDir
    ? path.resolve(opts.dataDir)
    : path.join(opts.projectRoot, '.od');
  const projectsRoot = path.resolve(root, 'projects');
  const dir = path.resolve(projectsRoot, projectId);
  // Defense in depth: even if a future `isSafeProjectId` change loosens the
  // allowlist, refuse to operate outside `<root>/projects/`.
  if (dir !== projectsRoot && !dir.startsWith(projectsRoot + path.sep)) {
    throw new Error('project id escapes projects root');
  }
  return { dir, file: path.join(dir, 'audit.jsonl') };
}

/**
 * Resolve + ensure the project's audit directory exists. Use this on the
 * write path only (`appendAuditEntry`), never on reads.
 */
function ensureAuditFile(projectId: string, opts: AuditOptions): string {
  const { dir, file } = resolveAuditPath(projectId, opts);
  fs.mkdirSync(dir, { recursive: true });
  return file;
}

// --- Redaction -------------------------------------------------------------

const REDACTED = '[redacted]';
const SENSITIVE_KEY_PATTERN =
  /^(?:.*[_-])?(?:token|secret|password|passwd|api[_-]?key|authorization|auth[_-]?header|access[_-]?key|private[_-]?key|cookie|session[_-]?id|credential|bearer|x[_-]?api[_-]?key)(?:[_-].*)?$/i;
const MAX_REDACTION_DEPTH = 6;
// Truncate excessively long string values defensively so a stray paste of a
// large blob (e.g. a base64-encoded screenshot) cannot bloat the audit file.
const MAX_STRING_LEN = 4 * 1024;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function redactValue(value: unknown, depth: number): unknown {
  if (depth > MAX_REDACTION_DEPTH) return REDACTED;
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LEN ? value.slice(0, MAX_STRING_LEN) + '…' : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => redactValue(v, depth + 1));
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEY_PATTERN.test(k) ? REDACTED : redactValue(v, depth + 1);
    }
    return out;
  }
  // Drop class instances, functions, symbols — JSON.stringify wouldn't
  // round-trip them anyway.
  return undefined;
}

function redactDetail(detail: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!detail) return detail;
  const result = redactValue(detail, 0);
  return isPlainObject(result) ? result : undefined;
}

function redactEntry(entry: AuditEntry): AuditEntry {
  const out: AuditEntry = {
    timestamp: entry.timestamp,
    projectId: entry.projectId,
    action: entry.action,
    actor: entry.actor,
  };
  if (entry.conversationId !== undefined) out.conversationId = entry.conversationId;
  if (entry.agentId !== undefined) out.agentId = entry.agentId;
  const redactedDetail = redactDetail(entry.detail);
  if (redactedDetail !== undefined) out.detail = redactedDetail;
  return out;
}

/**
 * Append a single audit entry. Atomic at the line level on POSIX (write(2)
 * is atomic for buffers smaller than PIPE_BUF, and JSONL stays well below).
 *
 * Sensitive fields in `entry.detail` (token / api_key / authorization etc.)
 * are recursively redacted before serialization, since `detail` is typed as
 * `Record<string, unknown>` and per-action shape is not enforced yet.
 */
export function appendAuditEntry(entry: AuditEntry, opts: AuditOptions): void {
  const file = ensureAuditFile(entry.projectId, opts);
  const safe = redactEntry(entry);
  const line = JSON.stringify(safe) + '\n';
  fs.appendFileSync(file, line, { encoding: 'utf8' });
}

interface ReadOptions extends AuditOptions {
  limit?: number;             // default 50, max 1000
  since?: number;             // ms epoch, only entries with ts >= since
  actions?: AuditAction[];    // filter by action types
}

/**
 * Read the most recent N audit entries. Reads from the end of the file
 * line-by-line and stops once `limit` matching entries are accumulated.
 *
 * For the v0 implementation we read the whole file. For projects with
 * very large audit logs (>1MB) a backwards-streaming reader should be
 * used instead — track this in the integration PR.
 */
export async function readAuditEntries(
  projectId: string,
  opts: ReadOptions,
): Promise<AuditEntry[]> {
  // Reads must not create directories — use the side-effect-free resolver.
  const { file } = resolveAuditPath(projectId, opts);
  if (!fs.existsSync(file)) return [];
  const limit = Math.min(opts.limit ?? 50, 1000);
  const since = opts.since ?? 0;
  const filterActions = opts.actions ? new Set(opts.actions) : null;

  const stream = fs.createReadStream(file, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const buffer: AuditEntry[] = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line) as AuditEntry;
      if (entry.timestamp < since) continue;
      if (filterActions && !filterActions.has(entry.action)) continue;
      buffer.push(entry);
    } catch {
      // skip malformed lines — JSONL append-only loses single rows at most
    }
  }
  return buffer.slice(-limit).reverse();
}

/**
 * Sensitive-data stripper for export.
 * Source: openwork apps/server/src/workspace-export-safety.ts
 *
 * Recursively strips fields whose key looks token-like (token / api_key /
 * authorization / cookie / password / private_key / session_id / bearer /
 * x-api-key — case-insensitive, with optional `_` / `-` separators on
 * either side). Truncates over-long string values defensively. Defense in
 * depth on top of `appendAuditEntry()` redaction, in case an upstream caller
 * appends raw lines or a future field gets added without going through the
 * append helper.
 */
export function redactForExport(entry: AuditEntry): AuditEntry {
  return redactEntry(entry);
}
