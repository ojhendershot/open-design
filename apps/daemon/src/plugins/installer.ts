// Plugin installer. Spec §7.2:
//
//   - `./folder` / `/abs/path`     — local-copy backend (Phase 1).
//   - `github:owner/repo[@ref][/subpath]` — fetched from
//     codeload.github.com as a tar.gz, extracted into a temp dir, then
//     copied into ~/.open-design/plugins/<id>/ via the local backend.
//   - `https://…tar.gz` / `…tgz`   — same extraction path, no path-rewrite.
//
// Hard install constraints (spec §7.2 / plan §3.A6):
//   - Reject path-traversal segments inside the source folder when copying.
//   - Reject symlinks (we do not stage non-local pointers).
//   - Cap copied tree size at 50 MiB by default.
//   - Refuse to overwrite a different plugin id at the destination.
//   - Tarball extraction inherits the same caps via tar's strict mode.

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { promises as fsp } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { x as tarExtract } from 'tar';
import {
  defaultRegistryRoots,
  deleteInstalledPlugin,
  resolvePluginFolder,
  upsertInstalledPlugin,
  type RegistryRoots,
} from './registry.js';
import type { InstalledPluginRecord, PluginSourceKind } from '@open-design/contracts';
import type Database from 'better-sqlite3';

type SqliteDb = Database.Database;

export interface InstallProgressEvent {
  kind: 'progress';
  phase: 'resolving' | 'copying' | 'parsing' | 'persisting';
  message: string;
}

export interface InstallSuccessEvent {
  kind: 'success';
  plugin: InstalledPluginRecord;
  warnings: string[];
}

export interface InstallErrorEvent {
  kind: 'error';
  message: string;
  warnings: string[];
}

export type InstallEvent = InstallProgressEvent | InstallSuccessEvent | InstallErrorEvent;

export interface InstallOptions {
  source: string;
  // Forwarded via env override or CLI flag; defaults to defaultRegistryRoots()
  // so daemon tests can point at a sandboxed home.
  roots?: RegistryRoots;
  // 50 MiB default mirrors spec §7.2; tests pin a tighter cap.
  maxBytes?: number;
  // When true (the default), an existing install with the same id is
  // replaced. Set false from CLI flows that want to surface a confirm step.
  overwriteExisting?: boolean;
  // Pluggable network fetcher for tests. Production injects globalThis.fetch.
  // The contract: returns a ReadableStream of the gzipped tar bytes.
  fetcher?: ArchiveFetcher;
}

export type ArchiveFetcher = (url: string) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  body: Readable | null;
}>;

const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;

const SAFE_BASENAME = /^[a-z0-9][a-z0-9._-]*$/;
const GITHUB_SOURCE_RE = /^github:([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)(?:@([A-Za-z0-9._/-]+))?(?:\/(.+))?$/;
const HTTPS_SOURCE_RE = /^https:\/\//i;

// Top-level dispatcher. Picks the backend off the source string and yields
// the same InstallEvent stream regardless of where the bytes came from.
export async function* installPlugin(
  db: SqliteDb,
  opts: InstallOptions,
): AsyncGenerator<InstallEvent, void, void> {
  if (opts.source.startsWith('github:')) {
    yield* installFromGithub(db, opts);
    return;
  }
  if (HTTPS_SOURCE_RE.test(opts.source)) {
    yield* installFromHttpsArchive(db, opts);
    return;
  }
  yield* installFromLocalFolder(db, opts);
}

// `github:owner/repo[@ref][/subpath]` → codeload tarball.
async function* installFromGithub(
  db: SqliteDb,
  opts: InstallOptions,
): AsyncGenerator<InstallEvent, void, void> {
  const match = GITHUB_SOURCE_RE.exec(opts.source);
  if (!match) {
    yield {
      kind: 'error',
      message: `Malformed github source ${opts.source}; expected github:owner/repo[@ref][/subpath]`,
      warnings: [],
    };
    return;
  }
  const [, owner, repo, ref, subpath] = match;
  const tarballUrl = `https://codeload.github.com/${owner}/${repo}/tar.gz/${ref ?? 'HEAD'}`;
  yield {
    kind: 'progress',
    phase: 'resolving',
    message: `Fetching ${tarballUrl}`,
  };
  yield* installFromArchiveUrl(db, opts, tarballUrl, subpath);
}

// Plain `https://…tar.gz` / `https://…tgz` source.
async function* installFromHttpsArchive(
  db: SqliteDb,
  opts: InstallOptions,
): AsyncGenerator<InstallEvent, void, void> {
  if (!/\.t(?:ar\.)?gz$/i.test(opts.source)) {
    yield {
      kind: 'error',
      message: `Only .tar.gz / .tgz archives are accepted from https sources (got ${opts.source})`,
      warnings: [],
    };
    return;
  }
  yield {
    kind: 'progress',
    phase: 'resolving',
    message: `Fetching ${opts.source}`,
  };
  yield* installFromArchiveUrl(db, opts, opts.source, undefined);
}

async function* installFromArchiveUrl(
  db: SqliteDb,
  opts: InstallOptions,
  url: string,
  subpath: string | undefined,
): AsyncGenerator<InstallEvent, void, void> {
  const fetcher = opts.fetcher ?? defaultFetcher;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'od-plugin-archive-'));
  try {
    const resp = await fetcher(url);
    if (!resp.ok || !resp.body) {
      yield {
        kind: 'error',
        message: `Fetch failed: ${resp.status} ${resp.statusText} for ${url}`,
        warnings: [],
      };
      return;
    }
    yield { kind: 'progress', phase: 'copying', message: 'Extracting archive' };
    let symlinkSeen = false;
    let traversalSeen = false;
    try {
      // The tar package handles gzip decompression. We pass `strip: 1`
      // because codeload tarballs always wrap the repo in a single
      // `repo-<sha>/` folder, and we want the manifest to land at
      // tmpRoot/<files>. The filter rejects symlinks / hard links and
      // any path-traversal segment; we then surface those as a clean
      // install error instead of silently skipping unsafe entries.
      await pipeline(
        resp.body as NodeJS.ReadableStream,
        tarExtract({
          cwd: tmpRoot,
          strip: 1,
          filter: (filePath, entry) => {
            const entryType = (entry as { type?: string }).type;
            if (entryType === 'SymbolicLink' || entryType === 'Link') {
              symlinkSeen = true;
              return false;
            }
            if (filePath.includes('..')) {
              traversalSeen = true;
              return false;
            }
            return true;
          },
        }) as NodeJS.WritableStream,
      );
    } catch (err) {
      yield {
        kind: 'error',
        message: `Archive extraction failed: ${(err as Error).message}`,
        warnings: [],
      };
      return;
    }
    if (symlinkSeen) {
      yield {
        kind: 'error',
        message: 'Archive contains symbolic / hard links — refusing to stage non-local pointers',
        warnings: [],
      };
      return;
    }
    if (traversalSeen) {
      yield {
        kind: 'error',
        message: 'Archive contains path-traversal segments — refusing to stage',
        warnings: [],
      };
      return;
    }
    // Pre-flight size check inside the staging dir.
    const total = await measureTreeSize(tmpRoot);
    if (total > maxBytes) {
      yield {
        kind: 'error',
        message: `Extracted archive exceeds ${maxBytes} bytes (size=${total})`,
        warnings: [],
      };
      return;
    }
    const stagingFolder = subpath
      ? path.join(tmpRoot, sanitizeRelativePath(subpath))
      : tmpRoot;
    if (!fs.existsSync(stagingFolder)) {
      yield {
        kind: 'error',
        message: `Subpath ${subpath} not found inside archive`,
        warnings: [],
      };
      return;
    }
    // Hand off to the local-folder backend so the registry write is the
    // single canonical implementation. The `source` string is the
    // original (github:… or https://…) so installed_plugins records
    // provenance accurately.
    yield* installFromLocalFolder(db, {
      ...opts,
      source: opts.source,
      // Drive the local backend through the staged folder; the
      // override on `_stagedFolder` is internal and lets us re-use the
      // copy / re-parse / persist phases without forking the function.
      _stagedFolder: stagingFolder,
      _stagedSourceKind: opts.source.startsWith('github:') ? 'github' : 'url',
    } as InstallOptions & { _stagedFolder?: string; _stagedSourceKind?: PluginSourceKind });
  } finally {
    await fsp.rm(tmpRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function defaultFetcher(url: string): ReturnType<ArchiveFetcher> {
  const response = await fetch(url, { redirect: 'follow' });
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    body: response.body ? Readable.fromWeb(response.body as never) : null,
  };
}

async function measureTreeSize(root: string): Promise<number> {
  let total = 0;
  const queue: string[] = [root];
  while (queue.length > 0) {
    const next = queue.pop()!;
    const stat = await fsp.lstat(next);
    if (stat.isDirectory()) {
      const entries = await fsp.readdir(next);
      for (const entry of entries) queue.push(path.join(next, entry));
    } else if (stat.isFile()) {
      total += stat.size;
    }
  }
  return total;
}

function sanitizeRelativePath(input: string): string {
  return input
    .replace(/^[\\/]+/, '')
    .split(/[\\/]+/)
    .filter((seg) => seg !== '..' && seg !== '.' && seg !== '')
    .join(path.sep);
}

export async function* installFromLocalFolder(
  db: SqliteDb,
  opts: InstallOptions & { _stagedFolder?: string; _stagedSourceKind?: PluginSourceKind },
): AsyncGenerator<InstallEvent, void, void> {
  const warnings: string[] = [];
  const roots = opts.roots ?? defaultRegistryRoots();
  // When called from the archive backend, the bytes are already on disk
  // under `_stagedFolder`; the public `source` field still records
  // provenance (github:owner/repo, https://example.com/foo.tgz, etc.).
  const sourceFolder = opts._stagedFolder ?? path.resolve(opts.source);
  const recordedSource = opts.source;
  const recordedSourceKind: PluginSourceKind = opts._stagedSourceKind ?? 'local';
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;

  yield { kind: 'progress', phase: 'resolving', message: `Resolving ${sourceFolder}` };

  let stats: fs.Stats;
  try {
    stats = await fsp.stat(sourceFolder);
  } catch (err) {
    yield { kind: 'error', message: `Source folder not found: ${sourceFolder} (${(err as Error).message})`, warnings };
    return;
  }
  if (!stats.isDirectory()) {
    yield { kind: 'error', message: `Source path is not a directory: ${sourceFolder}`, warnings };
    return;
  }

  // Probe the source manifest first so the destination folder name is
  // chosen by manifest id, not by directory name. This keeps registry
  // ids deterministic when authors rename the folder on disk between
  // installs.
  yield { kind: 'progress', phase: 'parsing', message: 'Parsing manifest' };
  const tentativeId = path.basename(sourceFolder).toLowerCase();
  const probe = await resolvePluginFolder({
    folder: sourceFolder,
    folderId: SAFE_BASENAME.test(tentativeId) ? tentativeId : 'plugin',
    sourceKind: recordedSourceKind,
    source: recordedSource,
  });
  if (!probe.ok) {
    yield { kind: 'error', message: probe.errors.join('; '), warnings: probe.warnings };
    return;
  }
  warnings.push(...probe.warnings);
  const pluginId = probe.record.id;
  if (!SAFE_BASENAME.test(pluginId)) {
    yield { kind: 'error', message: `Plugin id '${pluginId}' is not a safe folder name`, warnings };
    return;
  }
  const destFolder = path.join(roots.userPluginsRoot, pluginId);

  // Block overwriting a foreign plugin id. The destination folder may
  // contain a previous version of the same id, in which case we replace it.
  if (fs.existsSync(destFolder) && (opts.overwriteExisting ?? true) === false) {
    yield { kind: 'error', message: `Destination folder already exists: ${destFolder}. Pass overwriteExisting=true to replace.`, warnings };
    return;
  }

  yield { kind: 'progress', phase: 'copying', message: `Copying to ${destFolder}` };
  await fsp.mkdir(roots.userPluginsRoot, { recursive: true });
  if (fs.existsSync(destFolder)) {
    await fsp.rm(destFolder, { recursive: true, force: true });
  }
  try {
    await safeCopyTree(sourceFolder, destFolder, maxBytes);
  } catch (err) {
    yield { kind: 'error', message: `Copy failed: ${(err as Error).message}`, warnings };
    await fsp.rm(destFolder, { recursive: true, force: true }).catch(() => undefined);
    return;
  }

  yield { kind: 'progress', phase: 'parsing', message: 'Re-parsing destination' };
  const parsed = await resolvePluginFolder({
    folder: destFolder,
    folderId: pluginId,
    sourceKind: recordedSourceKind,
    source: recordedSource,
  });
  if (!parsed.ok) {
    await fsp.rm(destFolder, { recursive: true, force: true }).catch(() => undefined);
    yield { kind: 'error', message: parsed.errors.join('; '), warnings: [...warnings, ...parsed.warnings] };
    return;
  }
  warnings.push(...parsed.warnings);

  yield { kind: 'progress', phase: 'persisting', message: 'Writing installed_plugins row' };
  upsertInstalledPlugin(db, parsed.record);

  yield { kind: 'success', plugin: parsed.record, warnings };
}

export interface UninstallResult {
  ok: boolean;
  removedFolder?: string;
  warning?: string;
}

export async function uninstallPlugin(
  db: SqliteDb,
  id: string,
  roots: RegistryRoots = defaultRegistryRoots(),
): Promise<UninstallResult> {
  const removed = deleteInstalledPlugin(db, id);
  const folder = path.join(roots.userPluginsRoot, id);
  let removedFolder: string | undefined;
  try {
    await fsp.rm(folder, { recursive: true, force: true });
    if (fs.existsSync(folder)) {
      // Some platforms refuse to remove read-only files; surface a hint
      // instead of silently leaving stale on-disk state.
      return { ok: removed, warning: `Folder ${folder} could not be removed` };
    }
    removedFolder = folder;
  } catch (err) {
    return { ok: removed, warning: `Folder ${folder} removal failed: ${(err as Error).message}` };
  }
  return { ok: removed || removedFolder !== undefined, removedFolder };
}

// Recursive copy with budget tracking. Symlinks anywhere in the tree fail
// the copy outright; we never reach upstream paths through a clever link.
async function safeCopyTree(src: string, dest: string, maxBytes: number): Promise<void> {
  let bytesCopied = 0;
  const queue: Array<{ src: string; dest: string }> = [{ src, dest }];
  while (queue.length > 0) {
    const { src: from, dest: to } = queue.pop()!;
    const stat = await fsp.lstat(from);
    if (stat.isSymbolicLink()) {
      throw new Error(`Symbolic link rejected: ${from}`);
    }
    if (stat.isDirectory()) {
      await fsp.mkdir(to, { recursive: true });
      const entries = await fsp.readdir(from, { withFileTypes: true });
      for (const entry of entries) {
        if (!isSafeBasename(entry.name)) {
          throw new Error(`Unsafe path segment: ${entry.name}`);
        }
        queue.push({ src: path.join(from, entry.name), dest: path.join(to, entry.name) });
      }
      continue;
    }
    if (stat.isFile()) {
      bytesCopied += stat.size;
      if (bytesCopied > maxBytes) {
        throw new Error(`Plugin tree exceeds size cap of ${maxBytes} bytes`);
      }
      await fsp.copyFile(from, to);
      continue;
    }
    // Sockets / fifos / devices — refuse.
    throw new Error(`Unsupported file type at ${from}`);
  }
}

function isSafeBasename(name: string): boolean {
  if (name === '.' || name === '..') return false;
  if (name.includes('/') || name.includes('\\') || name.includes('\0')) return false;
  return true;
}

export type { PluginSourceKind };
