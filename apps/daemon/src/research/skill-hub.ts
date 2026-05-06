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
//   - For `design-systems` and `craft`, a manifest may use the historical
//     plain-Markdown shape (heading + `> Category:` / blockquote summary)
//     instead of YAML frontmatter; in that case the manifest id is derived
//     from the directory / file basename and the description is derived
//     from the heading and first blockquote block. The 140+ design systems
//     and craft modules Open Design already ships use this shape, so
//     rejecting it would break the starter's stated purpose.

import path from 'node:path';
import fs from 'node:fs/promises';

const DEFAULT_REPO = 'pftom/open-design-hub';
const DEFAULT_BRANCH = 'main';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_FILE_BYTES = 256 * 1024;     // 256KB per SKILL.md / DESIGN.md
const MAX_LIST_ENTRIES = 500;
const COMMIT_SHA_PATTERN = /^[0-9a-f]{7,40}$/i;

export type HubNamespace = 'skills' | 'design-systems' | 'craft';

export interface HubEntry {
  namespace: HubNamespace;
  name: string;
  description?: string;
  raw: string;                  // raw SKILL.md / DESIGN.md content
  source: {
    repo: string;
    branch: string;             // configured ref label (branch or "<sha>")
    path: string;
    /**
     * Immutable commit SHA the bytes were fetched at. Present iff the
     * caller passed `pinnedSha` (or `OD_HUB_PINNED_SHA`) so the listing
     * went through `?ref=<sha>` rather than a mutable branch tip. The
     * install gate (`installHubEntry`) refuses any entry that lacks this
     * field — branch-tip listings are browseable but not installable
     * (PR #617 review, P1).
     */
    commitSha?: string;
  };
}

interface HubConfig {
  repo?: string;                // owner/name
  branch?: string;
  token?: string;               // optional GitHub token (raises rate limit)
  /**
   * Pin all GitHub Contents API requests to this immutable commit SHA.
   * When set, the listing fetches via `?ref=<sha>` and every returned
   * `HubEntry.source.commitSha` is populated, so `installHubEntry` can
   * verify the bytes being written came from the SHA the user approved
   * (PR #617 review, P1). Falls back to `OD_HUB_PINNED_SHA` when the
   * caller does not pass one.
   */
  pinnedSha?: string;
}

interface ListCacheKey {
  repo: string;
  ref: string;          // SHA or branch — caches must not collapse the two
  namespace: HubNamespace;
}

const listCache = new Map<string, { ts: number; data: HubEntry[] }>();

function cacheKey(k: ListCacheKey): string {
  return `${k.repo}@${k.ref}/${k.namespace}`;
}

interface ResolvedHubRef {
  repo: string;
  branch: string;       // human-readable label
  ref: string;          // value passed to GitHub `?ref=` (sha or branch)
  commitSha?: string;   // populated iff a pinned SHA was supplied
  token?: string;
}

function repoOf(cfg?: HubConfig): ResolvedHubRef {
  const token = cfg?.token ?? process.env.OD_HUB_TOKEN;
  const repo = cfg?.repo ?? process.env.OD_HUB_REPO ?? DEFAULT_REPO;
  const branch = cfg?.branch ?? process.env.OD_HUB_BRANCH ?? DEFAULT_BRANCH;
  const rawPinned = cfg?.pinnedSha ?? process.env.OD_HUB_PINNED_SHA;
  let commitSha: string | undefined;
  if (rawPinned !== undefined && rawPinned !== '') {
    if (typeof rawPinned !== 'string' || !COMMIT_SHA_PATTERN.test(rawPinned)) {
      throw new Error('Hub: pinnedSha must be a 7–40 char commit SHA');
    }
    commitSha = rawPinned.toLowerCase();
  }
  return {
    repo,
    branch,
    ref: commitSha ?? branch,
    ...(commitSha ? { commitSha } : {}),
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
  const key = cacheKey({ repo: r.repo, ref: r.ref, namespace });
  const hit = listCache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data;

  const url = `https://api.github.com/repos/${r.repo}/contents/${namespace}?ref=${encodeURIComponent(r.ref)}`;
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
  r: ResolvedHubRef,
): Promise<HubEntry | null> {
  const fileName = namespace === 'skills' ? 'SKILL.md' : 'DESIGN.md';
  const url = `https://api.github.com/repos/${r.repo}/contents/${dir.path}/${fileName}?ref=${encodeURIComponent(r.ref)}`;
  try {
    const res = await ghFetch(url, r.token);
    const meta = (await res.json()) as ContentsItem;
    if (!meta.download_url) return null;
    const raw = await fetchRawCapped(meta.download_url, r.token);
    if (!raw) return null;
    const resolved = resolveManifest(namespace, raw, dir.name);
    if (!resolved) return null;
    return {
      namespace,
      name: dir.name,
      ...(resolved.description ? { description: resolved.description } : {}),
      raw,
      source: {
        repo: r.repo,
        branch: r.branch,
        path: `${dir.path}/${fileName}`,
        ...(r.commitSha ? { commitSha: r.commitSha } : {}),
      },
    };
  } catch {
    return null;
  }
}

async function readFileEntry(
  namespace: HubNamespace,
  file: ContentsItem,
  r: ResolvedHubRef,
): Promise<HubEntry | null> {
  if (!file.name.endsWith('.md')) return null;
  if (!file.download_url) return null;
  const raw = await fetchRawCapped(file.download_url, r.token);
  if (!raw) return null;
  const slug = file.name.replace(/\.md$/, '');
  const resolved = resolveManifest(namespace, raw, slug);
  if (!resolved) return null;
  return {
    namespace,
    name: slug,
    ...(resolved.description ? { description: resolved.description } : {}),
    raw,
    source: {
      repo: r.repo,
      branch: r.branch,
      path: file.path,
      ...(r.commitSha ? { commitSha: r.commitSha } : {}),
    },
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
// Values observed across the 65+ skills currently shipped in `skills/*/SKILL.md`
// plus the four documented in `docs/skills-protocol.md`. Keep this list aligned
// with reality so a hub mirroring the catalog does not reject media or utility
// skills (PR #617 review). The integration PR should replace this with a
// shared schema export from `apps/daemon/src/skills.ts`.
const ALLOWED_OD_MODES = new Set([
  'prototype',
  'deck',
  'template',
  'design-system',
  'image',
  'video',
  'audio',
  'utility',
]);

/**
 * Minimal frontmatter parser, intentionally a subset of
 * `apps/daemon/src/frontmatter.ts`. Supports top-level scalars, the `od:`
 * nested-scalar block, and YAML block scalars (`|`, `|-`, `>`, `>-`) for
 * `description` — which most existing `SKILL.md` files use. Anything more
 * complex is left as raw text for the integration PR to swap in the daemon
 * parser.
 *
 * Block scalars are joined with `\n` and right-trimmed, matching what
 * `apps/daemon/src/frontmatter.ts` does today. This sacrifices strict YAML
 * folding behavior for `>` in exchange for matching how the daemon already
 * reads the same files; consistency with the live catalog is the point.
 */
export function parseFrontmatter(raw: string): Record<string, unknown> {
  const text = raw.replace(/^﻿/, '');
  const match = FRONTMATTER_PATTERN.exec(text);
  if (!match) return {};
  const yaml = match[1];
  if (!yaml) return {};
  const out: Record<string, unknown> = {};
  const od: Record<string, unknown> = {};
  const lines = yaml.split(/\r?\n/);
  let i = 0;
  let inOdBlock = false;

  while (i < lines.length) {
    const rawLine = lines[i] ?? '';
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) {
      i++;
      continue;
    }
    const indent = rawLine.match(/^\s*/)?.[0].length ?? 0;
    const line = rawLine.slice(indent);

    if (indent === 0) {
      if (line === 'od:' || line.startsWith('od:')) {
        inOdBlock = line === 'od:';
        i++;
        continue;
      }
      inOdBlock = false;
      const kv = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(line);
      if (!kv) {
        i++;
        continue;
      }
      const key = kv[1];
      const val = (kv[2] ?? '').trim();
      if (!key) {
        i++;
        continue;
      }
      if (isBlockScalar(val)) {
        const block = readBlockScalar(lines, i + 1, indent);
        out[key] = block.value;
        i = block.next;
        continue;
      }
      out[key] = stripQuotes(val);
      i++;
      continue;
    }

    if (inOdBlock && indent === 2) {
      const kv = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(line);
      if (!kv) {
        i++;
        continue;
      }
      const key = kv[1];
      const val = (kv[2] ?? '').trim();
      if (!key) {
        i++;
        continue;
      }
      if (isBlockScalar(val)) {
        const block = readBlockScalar(lines, i + 1, indent);
        od[key] = block.value;
        i = block.next;
        continue;
      }
      od[key] = stripQuotes(val);
      i++;
      continue;
    }

    i++;
  }
  if (Object.keys(od).length > 0) out['od'] = od;
  return out;
}

function isBlockScalar(val: string): boolean {
  return (
    val === '|'
    || val === '|-'
    || val === '|+'
    || val === '>'
    || val === '>-'
    || val === '>+'
  );
}

function readBlockScalar(
  lines: string[],
  start: number,
  parentIndent: number,
): { value: string; next: number } {
  const collected: string[] = [];
  const childIndent = parentIndent + 2;
  let i = start;
  while (i < lines.length) {
    const next = lines[i] ?? '';
    if (next.trim() === '') {
      collected.push('');
      i++;
      continue;
    }
    const nIndent = next.match(/^\s*/)?.[0].length ?? 0;
    if (nIndent < childIndent) break;
    collected.push(next.slice(childIndent));
    i++;
  }
  return { value: collected.join('\n').trimEnd(), next: i };
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
 *
 * Note: this function only succeeds when the manifest carries YAML
 * frontmatter. For `design-systems` and `craft`, callers should prefer
 * `resolveManifest` so manifests in the historical plain-Markdown shape
 * (heading + `> Category:` blockquote) are also accepted.
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

const MAX_DESCRIPTION_CHARS = 280;

/**
 * Derive a description from the historical plain-Markdown shape used by
 * Open Design's existing `design-systems/*\/DESIGN.md` and `craft/*.md`
 * files: a top-level `# <Heading>` followed by an optional blockquote
 * block. Returns whatever was found, capped at `MAX_DESCRIPTION_CHARS`.
 *
 * Examples this needs to accept:
 *   - `# Design System Inspired by Apple` + `> Category: Media & Consumer`
 *   - `# Atelier Zero` + `> Category: Editorial · Studio` (multi-line)
 *   - `# Accessibility baseline craft rules` (no blockquote)
 */
export function deriveHeadingDescription(raw: string): {
  heading?: string;
  description?: string;
} {
  const text = raw.replace(/^﻿/, '');
  const stripped = text.replace(FRONTMATTER_PATTERN, (_match, _yaml, body: string) => body);
  const lines = stripped.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && (lines[i] ?? '').trim() === '') i++;
  const headingLine = lines[i];
  if (!headingLine || !headingLine.trimStart().startsWith('# ')) return {};
  const heading = headingLine.trimStart().slice(2).trim();
  if (!heading) return {};
  i++;
  while (i < lines.length && (lines[i] ?? '').trim() === '') i++;
  const blockquote: string[] = [];
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (!line.trimStart().startsWith('>')) break;
    const inner = line.replace(/^\s*>\s?/, '').trim();
    if (inner) blockquote.push(inner);
    i++;
  }
  const summary = blockquote.join(' ').trim();
  const combined = summary ? `${heading} — ${summary}` : heading;
  const description = combined.length > MAX_DESCRIPTION_CHARS
    ? `${combined.slice(0, MAX_DESCRIPTION_CHARS - 1).trimEnd()}…`
    : combined;
  return { heading, description };
}

/**
 * Resolve a hub manifest to `{description}` for storage in `HubEntry`.
 *
 *   - `skills` requires YAML frontmatter (the 65+ skills Open Design ships
 *     all use the documented `name` / `description` frontmatter shape).
 *   - `design-systems` and `craft` accept either YAML frontmatter or the
 *     historical plain-Markdown shape (heading + optional blockquote).
 *     The 140+ design systems and the craft modules currently in the repo
 *     use the latter, so a hub that mirrors them would otherwise return
 *     no entries.
 *
 * Always re-validates the manifest id against the namespace's slug rules
 * to keep the path-traversal guards intact.
 */
export function resolveManifest(
  namespace: HubNamespace,
  raw: string,
  manifestId: string,
): { description: string } | null {
  const fm = parseFrontmatter(raw);
  if (validateFrontmatter(namespace, fm, manifestId)) {
    const description = (fm['description'] as string).trim();
    return { description };
  }
  if (namespace === 'skills') return null;
  const idPattern = namespace === 'design-systems' ? NAME_PATTERN : SLUG_PATTERN;
  if (!idPattern.test(manifestId)) return null;
  const fmName = fm['name'];
  if (fmName !== undefined && (typeof fmName !== 'string' || fmName !== manifestId)) {
    return null;
  }
  const od = fm['od'];
  if (od !== undefined) {
    if (typeof od !== 'object' || od === null) return null;
    const mode = (od as Record<string, unknown>)['mode'];
    if (mode !== undefined && (typeof mode !== 'string' || !ALLOWED_OD_MODES.has(mode))) {
      return null;
    }
  }
  const fallback = deriveHeadingDescription(raw);
  if (!fallback.description) return null;
  return { description: fallback.description };
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

/**
 * Caller-supplied approval token. Manifest schema validation alone is NOT a
 * trust boundary — `SKILL.md` / `DESIGN.md` / craft markdown become
 * authoritative agent prompt material once written, so a compromised hub or
 * custom repo could persist prompt injection across projects without user
 * awareness (PR #617 review, P1).
 *
 * The starter therefore refuses to install unless the caller threads an
 * `InstallApproval` carrying:
 *   - `pinnedSha` — the immutable commit SHA the user reviewed (a branch
 *     ref like `main` is mutable and not acceptable here);
 *   - `userApproved: true` — a type-level forcing function so a default-
 *     constructed options object cannot trigger a write.
 *
 * What this starter already enforces:
 *   1. `listHubEntries` honors `HubConfig.pinnedSha` (or `OD_HUB_PINNED_SHA`)
 *      and routes the GitHub Contents API through `?ref=<sha>`, populating
 *      `HubEntry.source.commitSha` so the install gate can verify the bytes
 *      came from the approved commit (PR #617 review, P1).
 *   2. `installHubEntry` rejects any entry whose `source.commitSha` is
 *      missing or does not match `approval.pinnedSha` — defeating both the
 *      "list from `main`, approve any SHA-shaped string" attack and the
 *      "swap commits between approval and install" attack.
 *
 * What the integration PR still needs to add:
 *   1. Surface provenance + a diff against the previously installed copy
 *      before persisting.
 *   2. Default the install destination to a quarantined / user-managed
 *      store separate from the active prompt directories, until the user
 *      explicitly activates the entry — mirroring npm/homebrew/apt trust
 *      boundaries.
 *   3. Pin sibling-asset fetches (example.html, references/, assets/) to
 *      the same `commitSha` rather than the configured branch.
 */
export interface InstallApproval {
  pinnedSha: string;
  userApproved: true;
}

interface InstallOptions {
  targetRoot: string;            // e.g. <projectRoot>/skills or ~/.open-design/skills
  overwrite?: boolean;
  approval: InstallApproval;     // see `InstallApproval` — required
}

/**
 * Install a single hub entry. For `skills` / `design-systems` this writes
 * `<targetRoot>/<name>/SKILL.md` (or `DESIGN.md`). For `craft` this writes
 * `<targetRoot>/<name>.md` directly at the craft root, matching how
 * `apps/daemon/src/craft.ts` resolves sections (`<craftDir>/<slug>.md`).
 *
 * Trust boundary (PR #617 review, P1): callers must thread an
 * `InstallApproval` carrying the immutable commit SHA the user reviewed and
 * an explicit `userApproved: true`. Manifest validation is a *parsing*
 * step, not a trust step; without the approval gate, a hub repo could
 * silently overwrite an installed skill on its next mutation. See
 * `InstallApproval` for the planned quarantine + provenance flow.
 *
 * Provenance enforcement (PR #617 review, P1/P2):
 *   - Reject any entry whose `source.commitSha` is missing — that means the
 *     listing came through a mutable branch ref (`?ref=main`) and the bytes
 *     in `entry.raw` are not anchored to an immutable commit.
 *   - Reject when `source.commitSha` does not match `approval.pinnedSha` —
 *     that defeats a caller who lists from `main` then forwards an arbitrary
 *     SHA-shaped string to the install gate.
 *   - SHA comparison is case-insensitive but exact (no prefix matching),
 *     so a 7-char short SHA approval cannot stand in for a 40-char one.
 *
 * Re-validates frontmatter before writing — list cache may be stale, and an
 * untrusted hub entry that bypassed the listing path (e.g. via a custom
 * crafted `HubEntry`) is still rejected here.
 *
 * Note: this v0 only writes the manifest file. A full install also fetches
 * sibling assets (example.html, references/, assets/) — that pass should
 * iterate `GET /repos/.../contents/<dir>?ref=<sha>` (SHA, not branch) and
 * stream each child. Tracked for the integration PR.
 */
export async function installHubEntry(
  entry: HubEntry,
  opts: InstallOptions,
): Promise<{ path: string }> {
  if (!opts.approval || opts.approval.userApproved !== true) {
    throw new Error(
      'installHubEntry: explicit user approval required (see InstallApproval)',
    );
  }
  if (
    typeof opts.approval.pinnedSha !== 'string'
    || !COMMIT_SHA_PATTERN.test(opts.approval.pinnedSha)
  ) {
    throw new Error('installHubEntry: approval.pinnedSha must be a commit SHA');
  }
  const entrySha = entry.source?.commitSha;
  if (typeof entrySha !== 'string' || entrySha.length === 0) {
    throw new Error(
      `installHubEntry: entry has no source.commitSha — list with HubConfig.pinnedSha so bytes are anchored to an immutable commit (${entry.namespace}/${entry.name})`,
    );
  }
  if (!COMMIT_SHA_PATTERN.test(entrySha)) {
    throw new Error(
      `installHubEntry: entry.source.commitSha is not a commit SHA (${entry.namespace}/${entry.name})`,
    );
  }
  if (entrySha.toLowerCase() !== opts.approval.pinnedSha.toLowerCase()) {
    throw new Error(
      `installHubEntry: provenance mismatch — entry was fetched at ${entrySha} but approval pinned ${opts.approval.pinnedSha} (${entry.namespace}/${entry.name})`,
    );
  }
  if (!resolveManifest(entry.namespace, entry.raw, entry.name)) {
    throw new Error(`Hub entry manifest failed validation: ${entry.namespace}/${entry.name}`);
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
