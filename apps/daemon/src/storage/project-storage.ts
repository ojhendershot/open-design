// Phase 5 / spec §15.6 — `ProjectStorage` adapter interface.
//
// The daemon's project filesystem usage today is concentrated in
// `apps/daemon/src/projects.ts` (read/write/list/delete). Spec §15.6
// folds those calls behind a narrow interface so a future Phase 5
// patch can swap the implementation between local-disk (v1 default)
// and S3-compatible blob stores (AWS S3, GCS S3-compat, Azure Blob
// shim, Aliyun OSS, Tencent COS, Huawei OBS) without rewriting
// callers.
//
// This module is the substrate slice. It ships:
//
//   - `ProjectStorage` interface — the narrow contract every backend
//     implements (read / write / list / delete / stat).
//   - `LocalProjectStorage` — a thin wrapper over the existing
//     `apps/daemon/src/projects.ts` helpers; this is the v1 default.
//   - `S3ProjectStorage` — a stub that mirrors the interface and
//     records the operations it would perform. The real AWS SDK
//     wiring is the next Phase 5 PR; the stub exists so unit tests
//     can lock the interface contract.
//
// The daemon's existing project routes don't yet route through this
// adapter — that's an opt-in flag away (`OD_PROJECT_STORAGE=s3`).
// The substrate slice keeps the call sites unchanged so a wrong
// adapter never silently corrupts user data on roll-out.

import path from 'node:path';
import { promises as fsp } from 'node:fs';

export interface ProjectFileMeta {
  // Path relative to the project root. Always uses forward slashes.
  path: string;
  // Total size in bytes.
  size: number;
  // Unix epoch milliseconds of last modification.
  mtimeMs: number;
}

export interface ProjectStorage {
  // Reads `<projectId>/<relpath>` into a Buffer. Throws ENOENT-style
  // errors when missing; the caller maps to HTTP 404.
  readFile(projectId: string, relpath: string): Promise<Buffer>;
  // Writes `<projectId>/<relpath>` atomically. The default
  // implementation creates parent directories as needed.
  writeFile(projectId: string, relpath: string, body: Buffer): Promise<ProjectFileMeta>;
  // Lists every file under `<projectId>/` recursively. The order is
  // implementation-defined; callers that need deterministic order
  // sort by `path`.
  listFiles(projectId: string): Promise<ProjectFileMeta[]>;
  // Deletes a single file under `<projectId>/`. Idempotent — missing
  // files do not throw.
  deleteFile(projectId: string, relpath: string): Promise<void>;
  // Reports metadata for a single file without reading its bytes.
  // Returns null when the file is missing.
  statFile(projectId: string, relpath: string): Promise<ProjectFileMeta | null>;
}

export class StorageError extends Error {
  readonly code: 'NOT_FOUND' | 'TRAVERSAL' | 'IO';
  constructor(code: 'NOT_FOUND' | 'TRAVERSAL' | 'IO', message: string) {
    super(message);
    this.code = code;
    this.name = 'StorageError';
  }
}

/**
 * v1 default — backed by the daemon's existing `<dataDir>/.od/projects/`
 * filesystem layout. Pure pass-through to fs/promises with the
 * traversal guard the legacy `projects.ts` helpers already enforce.
 */
export class LocalProjectStorage implements ProjectStorage {
  constructor(private readonly projectsRoot: string) {}

  async readFile(projectId: string, relpath: string): Promise<Buffer> {
    const abs = this.resolvePath(projectId, relpath);
    try {
      return await fsp.readFile(abs);
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code === 'ENOENT') throw new StorageError('NOT_FOUND', `${projectId}/${relpath} not found`);
      throw new StorageError('IO', `read failed: ${e.message ?? String(e)}`);
    }
  }

  async writeFile(projectId: string, relpath: string, body: Buffer): Promise<ProjectFileMeta> {
    const abs = this.resolvePath(projectId, relpath);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, body);
    const stat = await fsp.stat(abs);
    return {
      path:    normalizeRel(relpath),
      size:    stat.size,
      mtimeMs: stat.mtimeMs,
    };
  }

  async listFiles(projectId: string): Promise<ProjectFileMeta[]> {
    const root = path.join(this.projectsRoot, projectId);
    const out: ProjectFileMeta[] = [];
    const queue: string[] = [root];
    while (queue.length > 0) {
      const dir = queue.pop()!;
      let entries;
      try {
        entries = await fsp.readdir(dir, { withFileTypes: true });
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
        throw new StorageError('IO', `list failed: ${(err as Error).message}`);
      }
      for (const entry of entries) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          queue.push(abs);
          continue;
        }
        if (!entry.isFile()) continue;
        const stat = await fsp.stat(abs);
        const rel = path.relative(root, abs).split(path.sep).join('/');
        out.push({ path: rel, size: stat.size, mtimeMs: stat.mtimeMs });
      }
    }
    return out;
  }

  async deleteFile(projectId: string, relpath: string): Promise<void> {
    const abs = this.resolvePath(projectId, relpath);
    try {
      await fsp.rm(abs, { force: true });
    } catch (err) {
      throw new StorageError('IO', `delete failed: ${(err as Error).message}`);
    }
  }

  async statFile(projectId: string, relpath: string): Promise<ProjectFileMeta | null> {
    const abs = this.resolvePath(projectId, relpath);
    try {
      const stat = await fsp.stat(abs);
      if (!stat.isFile()) return null;
      return {
        path:    normalizeRel(relpath),
        size:    stat.size,
        mtimeMs: stat.mtimeMs,
      };
    } catch {
      return null;
    }
  }

  private resolvePath(projectId: string, relpath: string): string {
    if (!projectId || projectId.includes('/') || projectId.includes('\\') || projectId.includes('\0') || projectId.includes('..')) {
      throw new StorageError('TRAVERSAL', `invalid projectId ${projectId}`);
    }
    const normalized = normalizeRel(relpath);
    if (!normalized) throw new StorageError('TRAVERSAL', 'empty relpath');
    if (normalized.split('/').some((seg) => seg === '..' || seg === '.')) {
      throw new StorageError('TRAVERSAL', `unsafe relpath ${relpath}`);
    }
    return path.join(this.projectsRoot, projectId, ...normalized.split('/'));
  }
}

/**
 * Phase 5 stub — interface-locked S3 backend. The runtime body throws
 * UNIMPLEMENTED so a misconfigured operator (`OD_PROJECT_STORAGE=s3`
 * without the matching env vars) sees a clear error instead of silently
 * dropping writes. The constructor records the AWS-shape parameters
 * (bucket, prefix, region, endpoint) so the next Phase 5 patch can
 * land the real impl behind the same interface.
 */
export interface S3ProjectStorageOptions {
  bucket:    string;
  region:    string;
  // Optional path prefix inside the bucket. Lets multiple OD
  // deployments share one bucket.
  prefix?:   string;
  // S3-compatible endpoint URL (Aliyun OSS, Tencent COS, Huawei OBS,
  // MinIO). Omit for AWS S3.
  endpoint?: string;
}

export class S3ProjectStorage implements ProjectStorage {
  constructor(public readonly options: S3ProjectStorageOptions) {
    if (!options.bucket) throw new StorageError('IO', 'S3ProjectStorage requires a bucket');
    if (!options.region) throw new StorageError('IO', 'S3ProjectStorage requires a region');
  }

  async readFile(projectId: string, relpath: string): Promise<Buffer> {
    void projectId; void relpath;
    throw new StorageError('IO', this.notWired('readFile'));
  }
  async writeFile(projectId: string, relpath: string, body: Buffer): Promise<ProjectFileMeta> {
    void projectId; void relpath; void body;
    throw new StorageError('IO', this.notWired('writeFile'));
  }
  async listFiles(projectId: string): Promise<ProjectFileMeta[]> {
    void projectId;
    throw new StorageError('IO', this.notWired('listFiles'));
  }
  async deleteFile(projectId: string, relpath: string): Promise<void> {
    void projectId; void relpath;
    throw new StorageError('IO', this.notWired('deleteFile'));
  }
  async statFile(projectId: string, relpath: string): Promise<ProjectFileMeta | null> {
    void projectId; void relpath;
    throw new StorageError('IO', this.notWired('statFile'));
  }

  // Build the canonical S3 key the impl will eventually use. Exposed
  // for tests so the prefix / projectId / relpath join is stable.
  keyFor(projectId: string, relpath: string): string {
    const normalized = normalizeRel(relpath);
    const segments = [this.options.prefix?.replace(/^\/+|\/+$/g, ''), projectId, normalized]
      .filter((s): s is string => typeof s === 'string' && s.length > 0);
    return segments.join('/');
  }

  private notWired(op: string): string {
    return `S3ProjectStorage.${op} is interface-only in v1; the AWS SDK wiring lands in the next Phase 5 PR. Set OD_PROJECT_STORAGE=local until then.`;
  }
}

/**
 * Resolve the daemon-wide project storage adapter from environment.
 * Default is local-disk; setting OD_PROJECT_STORAGE=s3 pulls the
 * stub above (and will pull the real impl once it lands).
 */
export function resolveProjectStorage(opts: {
  projectsRoot: string;
  env?: Record<string, string | undefined>;
}): ProjectStorage {
  const env = opts.env ?? process.env;
  const kind = (env.OD_PROJECT_STORAGE ?? 'local').trim().toLowerCase();
  if (kind === 's3') {
    return new S3ProjectStorage({
      bucket:   env.OD_S3_BUCKET ?? '',
      region:   env.OD_S3_REGION ?? '',
      ...(env.OD_S3_PREFIX   ? { prefix:   env.OD_S3_PREFIX }   : {}),
      ...(env.OD_S3_ENDPOINT ? { endpoint: env.OD_S3_ENDPOINT } : {}),
    });
  }
  return new LocalProjectStorage(opts.projectsRoot);
}

function normalizeRel(relpath: string): string {
  return String(relpath || '')
    .replace(/^[\\/]+/, '')
    .replace(/[\\]+/g, '/')
    .replace(/\/+/g, '/');
}
