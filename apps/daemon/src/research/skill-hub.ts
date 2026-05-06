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
import { createHmac, randomBytes } from 'node:crypto';

const DEFAULT_REPO = 'pftom/open-design-hub';
const DEFAULT_BRANCH = 'main';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_FILE_BYTES = 256 * 1024;     // 256KB per SKILL.md / DESIGN.md
const MAX_LIST_ENTRIES = 500;
// Caller-supplied form: 7–40 hex chars. The regex alone is not a trust
// boundary — `?ref=` also accepts branch/tag names, so a hub repo could
// create a hex-shaped branch and satisfy this pattern. `resolveHubRef`
// must canonicalize the input through the GitHub API before it is used as
// provenance (PR #617 review, P1).
const COMMIT_SHA_PATTERN = /^[0-9a-f]{7,40}$/i;
const FULL_COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;

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
     * Immutable commit SHA the bytes were fetched at, in full 40-char
     * form as resolved by the GitHub API. Present iff the caller passed
     * `pinnedSha` (or `OD_HUB_PINNED_SHA`) and `resolveHubRef` confirmed
     * the input resolved to an actual commit object whose canonical SHA
     * shares the input's hex prefix. A hex-shaped branch/tag would
     * resolve to a tip commit whose SHA does not share that prefix and
     * is rejected, so this field is never the caller's raw input echoed
     * back. The install gate (`installHubEntry`) refuses any entry that
     * lacks this field — branch-tip listings are browseable but not
     * installable (PR #617 review, P1).
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
   * The caller-supplied form may be a 7–40 char hex prefix; before any
   * listing happens, `resolveHubRef` calls
   * `GET /repos/{owner}/{repo}/commits/{input}` to canonicalize it to
   * the full 40-char commit SHA *and* rejects the input if GitHub
   * resolved it through a branch/tag named like a SHA (PR #617 review,
   * P1). The canonical SHA is then used as the `?ref=` value and stamped
   * on every `HubEntry.source.commitSha`, so `installHubEntry` can verify
   * the bytes being written came from the SHA the user approved. Falls
   * back to `OD_HUB_PINNED_SHA` when the caller does not pass one.
   */
  pinnedSha?: string;
}

interface ListCacheKey {
  repo: string;
  ref: string;          // SHA or branch — caches must not collapse the two
  namespace: HubNamespace;
  /**
   * Auth-mode partition. Either the literal `'public'` for tokenless
   * requests or a non-reversible HMAC fingerprint of the bearer token.
   * Required so a tokened request that surfaces private hub repo
   * manifests (where `entry.raw` becomes prompt material) cannot be
   * served back to a later tokenless request with the same
   * `(repo, ref, namespace)` (PR #617 review, P1).
   */
  authPartition: string;
}

const listCache = new Map<string, { ts: number; data: HubEntry[] }>();

// Per-process HMAC key for token fingerprints. Random per process so the
// fingerprint cannot be turned into a stable identifier across daemon
// restarts (a leaked cache key from one process is useless against the
// next), and never logged. We only use the fingerprint as a partition
// label — equal tokens hash to the same label so a second request with
// the same credentials can still hit the cache.
const TOKEN_FINGERPRINT_HMAC_KEY = randomBytes(32);

function authPartitionFor(token: string | undefined): string {
  if (!token) return 'public';
  const h = createHmac('sha256', TOKEN_FINGERPRINT_HMAC_KEY);
  h.update(token, 'utf8');
  return `t:${h.digest('hex').slice(0, 16)}`;
}

function cacheKey(k: ListCacheKey): string {
  return `${k.authPartition}|${k.repo}@${k.ref}/${k.namespace}`;
}

interface ResolvedHubRef {
  repo: string;
  branch: string;       // human-readable label
  ref: string;          // value passed to GitHub `?ref=` (canonical sha or branch)
  /**
   * Full 40-char commit SHA returned by the GitHub commits API, populated
   * iff the caller supplied a `pinnedSha` that resolved to an actual
   * commit object. Never the caller's raw input echoed back.
   */
  commitSha?: string;
  token?: string;
}

interface HubConfigResolved {
  repo: string;
  branch: string;
  token?: string;
  /** Caller-supplied SHA prefix (7–40 hex), pre-canonicalization. */
  pinnedShaInput?: string;
}

function readHubConfig(cfg?: HubConfig): HubConfigResolved {
  const token = cfg?.token ?? process.env.OD_HUB_TOKEN;
  const repo = cfg?.repo ?? process.env.OD_HUB_REPO ?? DEFAULT_REPO;
  const branch = cfg?.branch ?? process.env.OD_HUB_BRANCH ?? DEFAULT_BRANCH;
  const rawPinned = cfg?.pinnedSha ?? process.env.OD_HUB_PINNED_SHA;
  let pinnedShaInput: string | undefined;
  if (rawPinned !== undefined && rawPinned !== '') {
    if (typeof rawPinned !== 'string' || !COMMIT_SHA_PATTERN.test(rawPinned)) {
      throw new Error('Hub: pinnedSha must be a 7–40 char commit SHA');
    }
    pinnedShaInput = rawPinned.toLowerCase();
  }
  return {
    repo,
    branch,
    ...(token ? { token } : {}),
    ...(pinnedShaInput ? { pinnedShaInput } : {}),
  };
}

interface CommitObjectMeta {
  sha?: unknown;
}

/**
 * Resolve a hub config to a `ResolvedHubRef` with a canonical 40-char
 * commit SHA when `pinnedSha` is supplied (PR #617 review, P1).
 *
 * The caller-supplied `pinnedSha` may be 7–40 hex chars. The regex alone
 * is not a trust boundary — GitHub's `?ref=` parameter accepts branch
 * and tag names too, so a hub repo can create a hex-shaped branch and
 * pass the regex without ever pointing at the same commit twice. To
 * close that gap we:
 *
 *   1. Call `GET /repos/{owner}/{repo}/commits/{input}` which returns
 *      the canonical 40-char SHA in `.sha` for any ref-like input.
 *   2. Verify the canonical SHA's lowercase form starts with the input's
 *      lowercase hex prefix. A real commit-SHA prefix expansion always
 *      shares its hex with the canonical SHA; a branch/tag named like a
 *      SHA resolves to its tip commit, whose SHA does not share that
 *      hex prefix (collision probability for a 7-char prefix is ~1/2^28
 *      and is negligible for the 40-char case).
 *   3. Use the canonical full 40-char SHA as the `?ref=` value and as
 *      `HubEntry.source.commitSha` going forward.
 *
 * When no `pinnedSha` is supplied we return immediately without an API
 * call — branch-tip listings are still allowed but `commitSha` is left
 * unset and `installHubEntry` will refuse to install.
 */
async function resolveHubRef(cfg?: HubConfig): Promise<ResolvedHubRef> {
  const c = readHubConfig(cfg);
  if (c.pinnedShaInput === undefined) {
    return {
      repo: c.repo,
      branch: c.branch,
      ref: c.branch,
      ...(c.token ? { token: c.token } : {}),
    };
  }
  const url = `https://api.github.com/repos/${c.repo}/commits/${encodeURIComponent(c.pinnedShaInput)}`;
  let res: Response;
  try {
    res = await ghFetch(url, c.token);
  } catch (err) {
    throw new Error(
      `Hub: failed to resolve pinnedSha "${c.pinnedShaInput}" to a commit object — ${(err as Error).message}`,
    );
  }
  const meta = (await res.json()) as CommitObjectMeta;
  if (typeof meta.sha !== 'string' || !FULL_COMMIT_SHA_PATTERN.test(meta.sha)) {
    throw new Error(
      `Hub: GitHub did not return a commit SHA for pinnedSha "${c.pinnedShaInput}"`,
    );
  }
  const canonical = meta.sha.toLowerCase();
  if (!canonical.startsWith(c.pinnedShaInput)) {
    throw new Error(
      `Hub: pinnedSha "${c.pinnedShaInput}" resolved to commit ${canonical} but does not share its hex prefix — refusing to treat a non-commit ref (likely a branch or tag named like a SHA) as immutable provenance`,
    );
  }
  return {
    repo: c.repo,
    branch: c.branch,
    ref: canonical,
    commitSha: canonical,
    ...(c.token ? { token: c.token } : {}),
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
  const r = await resolveHubRef(cfg);
  const key = cacheKey({
    repo: r.repo,
    ref: r.ref,
    namespace,
    authPartition: authPartitionFor(r.token),
  });
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
 *      and resolves the caller-supplied SHA prefix to a canonical 40-char
 *      commit SHA via `GET /repos/{owner}/{repo}/commits/{input}`,
 *      rejecting any input that resolves through a branch/tag named like
 *      a SHA (the canonical SHA must share the input's hex prefix). The
 *      Contents API is then routed through `?ref=<canonicalSha>` and
 *      `HubEntry.source.commitSha` is stamped with that 40-char value, so
 *      the install gate can verify the bytes came from the approved
 *      commit (PR #617 review, P1).
 *   2. `installHubEntry` rejects any entry whose `source.commitSha` is
 *      missing or does not match `approval.pinnedSha` — defeating the
 *      "list from `main`, approve any SHA-shaped string" attack, the
 *      "swap commits between approval and install" attack, and the
 *      "branch named like a SHA" attack closed off in step 1.
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
  /**
   * Server-owned GitHub token for the hub re-fetch. Required when the
   * `HubEntry` came from `listHubEntries` against a private hub (i.e. the
   * caller passed `HubConfig.token` or set `OD_HUB_TOKEN`); without it the
   * re-fetch hits the GitHub API anonymously and 404s, defeating the
   * starter for tokened hubs (PR #617 review, P1).
   *
   * Carried out-of-band on the options object — never serialized onto
   * `HubEntry.source` — so a forwarded entry cannot leak the token across
   * a process boundary. Callers that don't already hold a server-owned
   * token should route through `installHubManifest`, which carries the
   * token on the selector instead.
   */
  token?: string;
}

/**
 * Server-owned selector for installing a hub manifest. Carries only the
 * fields the daemon needs to fetch the canonical bytes itself (PR #617
 * review, P1): a tuple identifying *which* manifest, plus the immutable
 * commit SHA the user approved. The bytes are never threaded through this
 * surface — the install path re-fetches them at `pinnedSha`.
 */
export interface HubInstallSelector {
  namespace: HubNamespace;
  name: string;
  /**
   * `<owner>/<repo>` slug. Required so an install routed to a
   * non-default hub still pins to the right repository.
   */
  repo: string;
  /**
   * Immutable commit SHA the user reviewed. May be a 7–40 hex prefix;
   * the install path canonicalizes it via the GitHub commits API and
   * verifies the canonical SHA shares the input's hex prefix (so a
   * branch/tag named like a SHA cannot stand in for a real commit).
   */
  pinnedSha: string;
  /**
   * Optional GitHub token for private hub repos. Same auth-partitioning
   * rules apply as `listHubEntries`.
   */
  token?: string;
}

interface SelectorInstallOptions {
  targetRoot: string;
  overwrite?: boolean;
  approval: InstallApproval;
}

const NAMESPACE_VALUES: ReadonlySet<HubNamespace> = new Set([
  'skills',
  'design-systems',
  'craft',
]);

function validateInstallApproval(approval: InstallApproval | undefined, fnName: string): void {
  if (!approval || approval.userApproved !== true) {
    throw new Error(
      `${fnName}: explicit user approval required (see InstallApproval)`,
    );
  }
  if (
    typeof approval.pinnedSha !== 'string'
    || !COMMIT_SHA_PATTERN.test(approval.pinnedSha)
  ) {
    throw new Error(`${fnName}: approval.pinnedSha must be a commit SHA`);
  }
}

function manifestPathFor(namespace: HubNamespace, name: string): string {
  if (namespace === 'craft') {
    if (!SLUG_PATTERN.test(name)) throw new Error(`Hub entry name invalid: ${name}`);
    return `${namespace}/${name}.md`;
  }
  if (!NAME_PATTERN.test(name)) throw new Error(`Hub entry name invalid: ${name}`);
  const fileName = namespace === 'skills' ? 'SKILL.md' : 'DESIGN.md';
  return `${namespace}/${name}/${fileName}`;
}

async function fetchManifestRawAtSha(
  selector: HubInstallSelector,
  canonicalSha: string,
): Promise<string> {
  const manifestPath = manifestPathFor(selector.namespace, selector.name);
  const url = `https://api.github.com/repos/${selector.repo}/contents/${manifestPath}?ref=${encodeURIComponent(canonicalSha)}`;
  const res = await ghFetch(url, selector.token);
  const meta = (await res.json()) as ContentsItem;
  if (meta.type !== 'file') {
    throw new Error(
      `installHubManifest: ${selector.namespace}/${selector.name} did not resolve to a file at ${canonicalSha}`,
    );
  }
  if (!meta.download_url) {
    throw new Error(
      `installHubManifest: ${selector.namespace}/${selector.name} has no download_url at ${canonicalSha}`,
    );
  }
  const raw = await fetchRawCapped(meta.download_url, selector.token);
  if (raw === null) {
    throw new Error(
      `installHubManifest: failed to fetch manifest bytes for ${selector.namespace}/${selector.name} at ${canonicalSha}`,
    );
  }
  return raw;
}

/**
 * Install a single hub manifest from a server-owned selector (PR #617
 * review, P1). Unlike `installHubEntry`, this entry point never trusts
 * caller-supplied bytes: it canonicalizes `selector.pinnedSha` through the
 * GitHub commits API, fetches the manifest at that canonical SHA, and
 * writes only the bytes it just fetched.
 *
 * Use this from any future route (`POST /api/skill-hub/install`) instead
 * of letting an HTTP body forward arbitrary `entry.raw` straight into the
 * writer. The selector is the only thing that needs to cross the trust
 * boundary; everything else is server-owned.
 */
export async function installHubManifest(
  selector: HubInstallSelector,
  opts: SelectorInstallOptions,
): Promise<{ path: string; commitSha: string }> {
  validateInstallApproval(opts.approval, 'installHubManifest');
  if (!NAMESPACE_VALUES.has(selector.namespace)) {
    throw new Error(`installHubManifest: invalid namespace ${String(selector.namespace)}`);
  }
  if (typeof selector.repo !== 'string' || !/^[\w.-]+\/[\w.-]+$/.test(selector.repo)) {
    throw new Error('installHubManifest: selector.repo must be "<owner>/<name>"');
  }
  if (typeof selector.pinnedSha !== 'string' || !COMMIT_SHA_PATTERN.test(selector.pinnedSha)) {
    throw new Error('installHubManifest: selector.pinnedSha must be a 7–40 char commit SHA');
  }
  if (selector.pinnedSha.toLowerCase() !== opts.approval.pinnedSha.toLowerCase()) {
    throw new Error(
      'installHubManifest: selector.pinnedSha must match approval.pinnedSha — the user must approve the same commit the daemon will fetch',
    );
  }

  const resolved = await resolveHubRef({
    repo: selector.repo,
    pinnedSha: selector.pinnedSha,
    ...(selector.token ? { token: selector.token } : {}),
  });
  const canonicalSha = resolved.commitSha;
  if (!canonicalSha) {
    throw new Error('installHubManifest: pinnedSha did not resolve to a canonical commit SHA');
  }

  const fetchToken = resolved.token ?? selector.token;
  const raw = await fetchManifestRawAtSha(
    {
      namespace: selector.namespace,
      name: selector.name,
      repo: selector.repo,
      pinnedSha: selector.pinnedSha,
      ...(fetchToken ? { token: fetchToken } : {}),
    },
    canonicalSha,
  );
  if (!resolveManifest(selector.namespace, raw, selector.name)) {
    throw new Error(
      `installHubManifest: manifest at ${selector.namespace}/${selector.name}@${canonicalSha} failed validation`,
    );
  }

  const target = await writeManifest({
    namespace: selector.namespace,
    name: selector.name,
    raw,
    targetRoot: opts.targetRoot,
    ...(opts.overwrite !== undefined ? { overwrite: opts.overwrite } : {}),
  });
  return { path: target, commitSha: canonicalSha };
}

interface WriteManifestArgs {
  namespace: HubNamespace;
  name: string;
  raw: string;
  targetRoot: string;
  overwrite?: boolean;
}

async function writeManifest(args: WriteManifestArgs): Promise<string> {
  let target: string;
  if (args.namespace === 'craft') {
    target = resolveSafeChild(args.targetRoot, `${args.name}.md`);
    await fs.mkdir(args.targetRoot, { recursive: true });
  } else {
    const childDir = resolveSafeChild(args.targetRoot, args.name);
    await fs.mkdir(childDir, { recursive: true });
    const fileName = args.namespace === 'skills' ? 'SKILL.md' : 'DESIGN.md';
    target = path.join(childDir, fileName);
  }
  if (!args.overwrite) {
    try {
      await fs.access(target);
      throw new Error(`Already installed: ${target} (pass overwrite: true to replace)`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }
  await fs.writeFile(target, args.raw, 'utf8');
  return target;
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
 *   - The bytes in `entry.raw` are NOT trusted: the install path re-fetches
 *     the manifest from `https://api.github.com/.../<entry.source.path>?ref=
 *     <entry.source.commitSha>` and writes only the freshly fetched bytes,
 *     so a forged `HubEntry` carrying matching SHA strings still cannot
 *     persist arbitrary prompt text (PR #617 review, P1). The freshly
 *     fetched bytes must equal `entry.raw` byte-for-byte; otherwise the
 *     listing cache is stale or tampered with and the install is rejected.
 *
 * Private-hub support: when the entry was listed through a tokened
 * `HubConfig` (or `OD_HUB_TOKEN`), the same server-owned token must be
 * passed via `opts.token` so the re-fetch can authenticate. The token is
 * never serialized onto `HubEntry.source`, because forwarding an entry
 * across a process boundary must not exfiltrate credentials (PR #617
 * review, P1). Callers that don't already hold a server-owned token
 * should use `installHubManifest`, which carries the token on the
 * selector instead.
 *
 * Future routes that take input from HTTP should call `installHubManifest`
 * (selector-only entry point) instead of forwarding a `HubEntry` body
 * straight in here. This entry point remains for in-process callers that
 * already hold an entry from `listHubEntries`.
 */
export async function installHubEntry(
  entry: HubEntry,
  opts: InstallOptions,
): Promise<{ path: string }> {
  validateInstallApproval(opts.approval, 'installHubEntry');
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
  if (typeof entry.source?.repo !== 'string' || !/^[\w.-]+\/[\w.-]+$/.test(entry.source.repo)) {
    throw new Error(
      `installHubEntry: entry.source.repo must be "<owner>/<name>" (${entry.namespace}/${entry.name})`,
    );
  }
  if (!resolveManifest(entry.namespace, entry.raw, entry.name)) {
    throw new Error(`Hub entry manifest failed validation: ${entry.namespace}/${entry.name}`);
  }
  // Server-owned re-fetch at the canonical commit SHA. We do not trust
  // `entry.raw`; we only trust the bytes we just pulled from GitHub at the
  // SHA the user approved (PR #617 review, P1).
  //
  // For private hubs the listing went through `HubConfig.token`, but
  // tokens are intentionally not carried on `HubEntry.source`. The caller
  // must thread the same server-owned token through `opts.token` (or
  // `OD_HUB_TOKEN`) so the re-fetch can authenticate; otherwise the
  // GitHub API will return 404 for the manifest and the install will
  // fail. See `InstallOptions.token`.
  const canonicalSha = entrySha.toLowerCase();
  const refetchToken = opts.token ?? process.env.OD_HUB_TOKEN;
  const fresh = await fetchManifestRawAtSha(
    {
      namespace: entry.namespace,
      name: entry.name,
      repo: entry.source.repo,
      pinnedSha: canonicalSha,
      ...(refetchToken ? { token: refetchToken } : {}),
    },
    canonicalSha,
  );
  if (fresh !== entry.raw) {
    throw new Error(
      `installHubEntry: manifest bytes drifted from listing at ${canonicalSha} for ${entry.namespace}/${entry.name} — refusing to write`,
    );
  }
  if (!resolveManifest(entry.namespace, fresh, entry.name)) {
    throw new Error(
      `Hub entry manifest failed validation after re-fetch: ${entry.namespace}/${entry.name}`,
    );
  }
  const target = await writeManifest({
    namespace: entry.namespace,
    name: entry.name,
    raw: fresh,
    targetRoot: opts.targetRoot,
    ...(opts.overwrite !== undefined ? { overwrite: opts.overwrite } : {}),
  });
  return { path: target };
}
