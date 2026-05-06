// Skill Hub — research starter (not wired into server.ts).
//
// Source: docs/research/openwork-aionui-alaude-integration.md §5.1.C
// Inspired by openwork apps/server/src/skill-hub.ts:
//   - GitHub repo as registry (default `pftom/open-design-hub@main`).
//   - GitHub Contents API to enumerate `/skills/` and read raw `SKILL.md`.
//   - 5-minute catalog cache.
//   - Path-traversal guard via `resolveSafeChild`.
//
// Open Design extension:
//   - Three namespaces under one repo: `/skills/`, `/design-systems/`, and
//     `/craft/`. The first two are directories with a `SKILL.md` /
//     `DESIGN.md` manifest; the third is a flat collection of `<slug>.md`
//     files (matches `apps/daemon/src/craft.ts` resolution layout).
//   - Frontmatter validation matches the minimum schema in
//     `docs/skills-protocol.md` (name + description, optional `od:` block).

import path from 'node:path';
import fs from 'node:fs/promises';

const DEFAULT_REPO = 'pftom/open-design-hub';
const DEFAULT_BRANCH = 'main';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_FILE_BYTES = 256 * 1024;     // 256KB per SKILL.md / DESIGN.md
const MAX_LIST_ENTRIES = 500;

export type HubNamespace = 'skills' | 'design-systems' | 'craft';

export interface HubEntry {
  namespace: HubNamespace;
  name: string;
  description?: string;
  raw: string;                  // raw SKILL.md / DESIGN.md content
  source: { repo: string; branch: string; path: string };
}

interface HubConfig {
  repo?: string;                // owner/name
  branch?: string;
  token?: string;               // optional GitHub token (raises rate limit)
}

interface ListCacheKey {
  repo: string;
  branch: string;
  namespace: HubNamespace;
}

const listCache = new Map<string, { ts: number; data: HubEntry[] }>();

function cacheKey(k: ListCacheKey): string {
  return `${k.repo}@${k.branch}/${k.namespace}`;
}

function repoOf(cfg?: HubConfig): { repo: string; branch: string; token?: string } {
  const token = cfg?.token ?? process.env.OD_HUB_TOKEN;
  return {
    repo: cfg?.repo ?? process.env.OD_HUB_REPO ?? DEFAULT_REPO,
    branch: cfg?.branch ?? process.env.OD_HUB_BRANCH ?? DEFAULT_BRANCH,
    ...(token ? { token } : {}),
  };
}

function ghHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function ghFetch(url: string, token?: string): Promise<Response> {
  const res = await fetch(url, { headers: ghHeaders(token) });
  if (!res.ok) {
    throw new Error(`Hub fetch failed: ${res.status} ${res.statusText} for ${url}`);
  }
  return res;
}

interface ContentsItem {
  name: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  path: string;
  download_url: string | null;
}

/**
 * Enumerate the catalog under a namespace. Returns entries with the
 * `SKILL.md` / `DESIGN.md` / `*.md` content already parsed. Uses 5-min
 * cache per (repo, branch, namespace).
 */
export async function listHubEntries(
  namespace: HubNamespace,
  cfg?: HubConfig,
): Promise<HubEntry[]> {
  const r = repoOf(cfg);
  const key = cacheKey({ repo: r.repo, branch: r.branch, namespace });
  const hit = listCache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data;

  const url = `https://api.github.com/repos/${r.repo}/contents/${namespace}?ref=${r.branch}`;
  const res = await ghFetch(url, r.token);
  const items = (await res.json()) as ContentsItem[];

  const entries: HubEntry[] = [];
  for (const item of items.slice(0, MAX_LIST_ENTRIES)) {
    if (item.type === 'dir' && namespace !== 'craft') {
      const entry = await readDirEntry(namespace, item, r);
      if (entry) entries.push(entry);
    } else if (item.type === 'file' && namespace === 'craft') {
      const entry = await readFileEntry(namespace, item, r);
      if (entry) entries.push(entry);
    }
  }

  listCache.set(key, { ts: Date.now(), data: entries });
  return entries;
}

async function readDirEntry(
  namespace: HubNamespace,
  dir: ContentsItem,
  r: { repo: string; branch: string; token?: string },
): Promise<HubEntry | null> {
  const fileName = namespace === 'skills' ? 'SKILL.md' : 'DESIGN.md';
  const url = `https://api.github.com/repos/${r.repo}/contents/${dir.path}/${fileName}?ref=${r.branch}`;
  try {
    const res = await ghFetch(url, r.token);
    const meta = (await res.json()) as ContentsItem;
    if (!meta.download_url) return null;
    const raw = await fetchRawCapped(meta.download_url, r.token);
    if (!raw) return null;
    const fm = parseFrontmatter(raw);
    if (!validateFrontmatter(namespace, fm, dir.name)) return null;
    const description = typeof fm['description'] === 'string' ? fm['description'].trim() : undefined;
    return {
      namespace,
      name: dir.name,
      ...(description ? { description } : {}),
      raw,
      source: { repo: r.repo, branch: r.branch, path: `${dir.path}/${fileName}` },
    };
  } catch {
    return null;
  }
}

async function readFileEntry(
  namespace: HubNamespace,
  file: ContentsItem,
  r: { repo: string; branch: string; token?: string },
): Promise<HubEntry | null> {
  if (!file.name.endsWith('.md')) return null;
  if (!file.download_url) return null;
  const raw = await fetchRawCapped(file.download_url, r.token);
  if (!raw) return null;
  const slug = file.name.replace(/\.md$/, '');
  const fm = parseFrontmatter(raw);
  if (!validateFrontmatter(namespace, fm, slug)) return null;
  const description = typeof fm['description'] === 'string' ? fm['description'].trim() : undefined;
  return {
    namespace,
    name: slug,
    ...(description ? { description } : {}),
    raw,
    source: { repo: r.repo, branch: r.branch, path: file.path },
  };
}

/**
 * Stream-bounded download. Bails before consuming bandwidth or memory for
 * files larger than `MAX_FILE_BYTES` (PR #617 review, P2):
 *   1. Inspect `Content-Length` first — if the server declared a size over
 *      the cap, abort the response without reading the body.
 *   2. Otherwise read the body chunk-by-chunk and `cancel()` the reader as
 *      soon as the accumulated size exceeds the cap.
 */
async function fetchRawCapped(url: string, token?: string): Promise<string | null> {
  const ac = new AbortController();
  let res: Response;
  try {
    res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: ac.signal,
    });
  } catch {
    return null;
  }
  if (!res.ok) {
    try {
      ac.abort();
    } catch {}
    return null;
  }
  const declared = res.headers.get('content-length');
  if (declared !== null) {
    const declaredBytes = Number(declared);
    if (Number.isFinite(declaredBytes) && declaredBytes > MAX_FILE_BYTES) {
      try {
        ac.abort();
      } catch {}
      return null;
    }
  }
  if (!res.body) return null;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_FILE_BYTES) {
        try {
          await reader.cancel();
        } catch {}
        return null;
      }
      chunks.push(value);
    }
  } catch {
    try {
      await reader.cancel();
    } catch {}
    return null;
  }
  const all = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(all);
}

// --- Frontmatter validation -----------------------------------------------

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/i;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,127}$/;
const ALLOWED_OD_MODES = new Set(['prototype', 'deck', 'template', 'design-system']);

/**
 * Minimal frontmatter parser, intentionally a subset of
 * `apps/daemon/src/frontmatter.ts`. Supports the fields we actually validate
 * here (top-level scalars and the `od.mode` scalar). Anything more complex is
 * left as raw text for the integration PR to swap in the daemon parser.
 */
export function parseFrontmatter(raw: string): Record<string, unknown> {
  const text = raw.replace(/^﻿/, '');
  const match = FRONTMATTER_PATTERN.exec(text);
  if (!match) return {};
  const yaml = match[1];
  if (!yaml) return {};
  const out: Record<string, unknown> = {};
  let inOdBlock = false;
  const od: Record<string, unknown> = {};
  for (const rawLine of yaml.split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;
    const indent = rawLine.match(/^\s*/)?.[0].length ?? 0;
    const line = rawLine.slice(indent);
    if (indent === 0) {
      if (line === 'od:' || line.startsWith('od:')) {
        inOdBlock = true;
        const inline = line.slice(3).trim();
        if (inline) {
          inOdBlock = false;
          // od: <scalar> is not a documented shape; ignore.
        }
        continue;
      }
      inOdBlock = false;
      const kv = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(line);
      if (!kv) continue;
      const key = kv[1];
      const val = (kv[2] ?? '').trim();
      if (!key) continue;
      out[key] = stripQuotes(val);
    } else if (inOdBlock && indent === 2) {
      const kv = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(line);
      if (!kv) continue;
      const key = kv[1];
      const val = (kv[2] ?? '').trim();
      if (!key) continue;
      od[key] = stripQuotes(val);
    }
  }
  if (Object.keys(od).length > 0) out['od'] = od;
  return out;
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

/**
 * Validate the minimum schema required by `docs/skills-protocol.md` for the
 * given namespace. Each rule is intentionally narrow so the v0 shape stays
 * readable; the integration PR should replace this with a parity test
 * against the daemon's frontmatter parser.
 *
 *   - skills          → name (slug-shaped) and description required.
 *                       If `od.mode` is set, must be one of the documented
 *                       modes.
 *                       The frontmatter `name` MUST match the directory.
 *   - design-systems  → name + description required, name matches directory.
 *   - craft           → description required, file basename must be a
 *                       lowercase slug, and the frontmatter `name` (if
 *                       present) must match the file basename.
 */
export function validateFrontmatter(
  namespace: HubNamespace,
  fm: Record<string, unknown>,
  manifestId: string,
): boolean {
  const description = fm['description'];
  if (typeof description !== 'string' || description.trim().length === 0) {
    return false;
  }
  const name = fm['name'];
  if (namespace === 'skills' || namespace === 'design-systems') {
    if (typeof name !== 'string' || !NAME_PATTERN.test(name)) return false;
    if (name !== manifestId) return false;
  } else {
    if (!SLUG_PATTERN.test(manifestId)) return false;
    if (name !== undefined) {
      if (typeof name !== 'string' || name !== manifestId) return false;
    }
  }
  const od = fm['od'];
  if (od !== undefined) {
    if (typeof od !== 'object' || od === null) return false;
    const mode = (od as Record<string, unknown>)['mode'];
    if (mode !== undefined) {
      if (typeof mode !== 'string' || !ALLOWED_OD_MODES.has(mode)) return false;
    }
  }
  return true;
}

/**
 * Resolve a child path safely under `targetRoot`. Rejects any name that
 * escapes via `..`, absolute paths, or null bytes. Source: openwork
 * apps/server/src/skill-hub.ts `resolveSafeChild`.
 */
export function resolveSafeChild(targetRoot: string, name: string): string {
  if (!name || name.includes('\0') || name.includes('..')) {
    throw new Error(`Invalid hub entry name: ${name}`);
  }
  if (path.isAbsolute(name)) throw new Error(`Hub entry name must be relative: ${name}`);
  const resolved = path.resolve(targetRoot, name);
  const rootResolved = path.resolve(targetRoot);
  if (!resolved.startsWith(rootResolved + path.sep) && resolved !== rootResolved) {
    throw new Error(`Hub entry escapes target root: ${name}`);
  }
  return resolved;
}

interface InstallOptions {
  targetRoot: string;            // e.g. <projectRoot>/skills or ~/.open-design/skills
  overwrite?: boolean;
}

/**
 * Install a single hub entry. For `skills` / `design-systems` this writes
 * `<targetRoot>/<name>/SKILL.md` (or `DESIGN.md`). For `craft` this writes
 * `<targetRoot>/<name>.md` directly at the craft root, matching how
 * `apps/daemon/src/craft.ts` resolves sections (`<craftDir>/<slug>.md`).
 *
 * Re-validates frontmatter before writing — list cache may be stale, and an
 * untrusted hub entry that bypassed the listing path (e.g. via a custom
 * crafted `HubEntry`) is still rejected here.
 *
 * Note: this v0 only writes the manifest file. A full install also fetches
 * sibling assets (example.html, references/, assets/) — that pass should
 * iterate `GET /repos/.../contents/<dir>?ref=<branch>` and stream each child.
 * Tracked for the integration PR.
 */
export async function installHubEntry(
  entry: HubEntry,
  opts: InstallOptions,
): Promise<{ path: string }> {
  const fm = parseFrontmatter(entry.raw);
  if (!validateFrontmatter(entry.namespace, fm, entry.name)) {
    throw new Error(`Hub entry frontmatter failed validation: ${entry.namespace}/${entry.name}`);
  }
  let target: string;
  if (entry.namespace === 'craft') {
    target = resolveSafeChild(opts.targetRoot, `${entry.name}.md`);
    await fs.mkdir(opts.targetRoot, { recursive: true });
  } else {
    const childDir = resolveSafeChild(opts.targetRoot, entry.name);
    await fs.mkdir(childDir, { recursive: true });
    const fileName = entry.namespace === 'skills' ? 'SKILL.md' : 'DESIGN.md';
    target = path.join(childDir, fileName);
  }
  if (!opts.overwrite) {
    try {
      await fs.access(target);
      throw new Error(`Already installed: ${target} (pass overwrite: true to replace)`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }
  await fs.writeFile(target, entry.raw, 'utf8');
  return { path: target };
}
