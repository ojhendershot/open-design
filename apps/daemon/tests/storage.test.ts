// Phase 5 / spec §15.6 — ProjectStorage + DaemonDb adapter tests.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  LocalProjectStorage,
  S3ProjectStorage,
  StorageError,
  resolveProjectStorage,
} from '../src/storage/project-storage.js';
import {
  DaemonDbConfigError,
  resolveDaemonDbConfig,
} from '../src/storage/daemon-db.js';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(path.join(os.tmpdir(), 'od-storage-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('LocalProjectStorage', () => {
  it('writes, lists, reads, stats, and deletes a file', async () => {
    const storage = new LocalProjectStorage(tmp);
    const meta = await storage.writeFile('p1', 'hello.txt', Buffer.from('hi'));
    expect(meta.path).toBe('hello.txt');
    expect(meta.size).toBe(2);

    const list = await storage.listFiles('p1');
    expect(list.map((f) => f.path).sort()).toEqual(['hello.txt']);

    const buf = await storage.readFile('p1', 'hello.txt');
    expect(buf.toString('utf8')).toBe('hi');

    const stat = await storage.statFile('p1', 'hello.txt');
    expect(stat?.size).toBe(2);

    await storage.deleteFile('p1', 'hello.txt');
    expect(await storage.statFile('p1', 'hello.txt')).toBeNull();
  });

  it('walks nested directories on list', async () => {
    const projectRoot = path.join(tmp, 'p2');
    await mkdir(path.join(projectRoot, 'a', 'b'), { recursive: true });
    await writeFile(path.join(projectRoot, 'a', 'b', 'deep.txt'), 'x');
    const storage = new LocalProjectStorage(tmp);
    const list = await storage.listFiles('p2');
    expect(list.map((f) => f.path)).toEqual(['a/b/deep.txt']);
  });

  it('rejects path-traversal and unsafe ids', async () => {
    const storage = new LocalProjectStorage(tmp);
    await expect(storage.readFile('p1', '../escape')).rejects.toBeInstanceOf(StorageError);
    await expect(storage.readFile('../bad', 'x.txt')).rejects.toBeInstanceOf(StorageError);
    await expect(storage.readFile('p1', '')).rejects.toBeInstanceOf(StorageError);
  });

  it('returns NOT_FOUND on a missing file', async () => {
    const storage = new LocalProjectStorage(tmp);
    await expect(storage.readFile('p1', 'no-such.txt')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('S3ProjectStorage stub', () => {
  it('builds a canonical key with the configured prefix', () => {
    const storage = new S3ProjectStorage({
      bucket: 'od-bucket',
      region: 'us-east-1',
      prefix: 'tenant-a/',
    });
    expect(storage.keyFor('p1', 'a/b/c.txt')).toBe('tenant-a/p1/a/b/c.txt');
  });

  it('throws StorageError(IO) on every operation until the AWS SDK wiring lands', async () => {
    const storage = new S3ProjectStorage({ bucket: 'b', region: 'r' });
    await expect(storage.readFile('p1', 'x')).rejects.toBeInstanceOf(StorageError);
    await expect(storage.writeFile('p1', 'x', Buffer.from('hi'))).rejects.toBeInstanceOf(StorageError);
    await expect(storage.listFiles('p1')).rejects.toBeInstanceOf(StorageError);
    await expect(storage.deleteFile('p1', 'x')).rejects.toBeInstanceOf(StorageError);
    await expect(storage.statFile('p1', 'x')).rejects.toBeInstanceOf(StorageError);
  });

  it('refuses to instantiate without bucket / region', () => {
    expect(() => new S3ProjectStorage({ bucket: '', region: 'r' })).toThrow(StorageError);
    expect(() => new S3ProjectStorage({ bucket: 'b', region: '' })).toThrow(StorageError);
  });
});

describe('resolveProjectStorage', () => {
  it('defaults to LocalProjectStorage', () => {
    const storage = resolveProjectStorage({ projectsRoot: tmp, env: {} });
    expect(storage).toBeInstanceOf(LocalProjectStorage);
  });

  it('returns S3ProjectStorage when OD_PROJECT_STORAGE=s3', () => {
    const storage = resolveProjectStorage({
      projectsRoot: tmp,
      env: {
        OD_PROJECT_STORAGE: 's3',
        OD_S3_BUCKET:       'my-bucket',
        OD_S3_REGION:       'us-east-1',
        OD_S3_PREFIX:       'tenant',
        OD_S3_ENDPOINT:     'https://oss.aliyuncs.com',
      },
    });
    expect(storage).toBeInstanceOf(S3ProjectStorage);
    expect((storage as S3ProjectStorage).options).toMatchObject({
      bucket:   'my-bucket',
      region:   'us-east-1',
      prefix:   'tenant',
      endpoint: 'https://oss.aliyuncs.com',
    });
  });
});

describe('resolveDaemonDbConfig', () => {
  it('defaults to sqlite', () => {
    expect(resolveDaemonDbConfig({})).toEqual({ kind: 'sqlite' });
  });

  it('parses postgres env vars when OD_DAEMON_DB=postgres', () => {
    const cfg = resolveDaemonDbConfig({
      OD_DAEMON_DB: 'postgres',
      OD_PG_HOST:   'pg.local',
      OD_PG_PORT:   '6543',
      OD_PG_DATABASE: 'open_design',
      OD_PG_USER:   'od',
      OD_PG_SSL_MODE: 'disable',
    });
    expect(cfg.kind).toBe('postgres');
    expect(cfg.postgres).toEqual({
      host:     'pg.local',
      port:     6543,
      database: 'open_design',
      user:     'od',
      sslMode:  'disable',
    });
  });

  it('throws when postgres env vars are incomplete', () => {
    expect(() =>
      resolveDaemonDbConfig({ OD_DAEMON_DB: 'postgres', OD_PG_HOST: 'pg.local' }),
    ).toThrow(DaemonDbConfigError);
  });

  it('throws on an unknown OD_DAEMON_DB value', () => {
    expect(() => resolveDaemonDbConfig({ OD_DAEMON_DB: 'mongo' })).toThrow(DaemonDbConfigError);
  });
});
