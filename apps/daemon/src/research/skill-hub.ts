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
//   - Two namespaces under one repo: `/skills/` and `/design-systems/`.
//     Same fetcher, just different list endpoints.
//   - Frontmatter validation matches docs/skills-protocol.md (SKILL.md +
//     optional `od:` block).

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
    const description = extractDescription(raw);
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
  const name = file.name.replace(/\.md$/, '');
  const description = extractDescription(raw);
  return {
    namespace,
    name,
    ...(description ? { description } : {}),
    raw,
    source: { repo: r.repo, branch: r.branch, path: file.path },
  };
}

async function fetchRawCapped(url: string, token?: string): Promise<string | null> {
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_FILE_BYTES) return null;
  return new TextDecoder('utf-8', { fatal: false }).decode(buf);
}

function extractDescription(raw: string): string | undefined {
  const m = raw.match(/^description:\s*(.+)$/m);
  if (!m) return undefined;
  const captured = m[1];
  return captured ? captured.trim() : undefined;
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
 * Note: this v0 only writes the manifest file. A full install also fetches
 * sibling assets (example.html, references/, assets/) — that pass should
 * iterate `GET /repos/.../contents/<dir>?ref=<branch>` and stream each child.
 * Tracked for the integration PR.
 */
export async function installHubEntry(
  entry: HubEntry,
  opts: InstallOptions,
): Promise<{ path: string }> {
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
