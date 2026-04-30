import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { deleteProjectFile, listFiles, readProjectFile, writeProjectFile } from '../src/projects.js';
import {
  createLiveArtifact,
  ensureLiveArtifactStoreLayout,
  generateLiveArtifactId,
  generateLiveArtifactSlug,
  getLiveArtifact,
  ensureLiveArtifactPreview,
  liveArtifactStorePaths,
  liveArtifactTilePath,
  listLiveArtifacts,
  regenerateLiveArtifactPreview,
  updateLiveArtifact,
  validateLiveArtifactStorageId,
} from '../src/live-artifacts/store.js';

const tempRoots: string[] = [];

async function makeProjectsRoot() {
  const root = await mkdtemp(path.join(tmpdir(), 'od-live-artifacts-'));
  tempRoots.push(root);
  return path.join(root, 'projects');
}

function validCreateInput() {
  return {
    title: 'Launch Metrics: Q2!',
    slug: 'launch-metrics-q2',
    sessionId: 'session-123',
    pinned: true,
    status: 'archived' as const,
    preview: {
      type: 'html' as const,
      entry: 'index.html',
    },
    tiles: [
      {
        id: 'tile-1',
        kind: 'metric' as const,
        title: 'Revenue',
        renderJson: {
          type: 'metric' as const,
          label: 'Revenue',
          value: '$42K',
        },
        provenanceJson: {
          generatedAt: '2026-04-29T12:00:00.000Z',
          generatedBy: 'agent' as const,
          sources: [{ label: 'Prompt', type: 'user_input' as const }],
        },
        refreshStatus: 'not_refreshable' as const,
      },
    ],
    document: {
      format: 'html_template_v1' as const,
      templatePath: 'template.html' as const,
      generatedPreviewPath: 'index.html' as const,
      dataPath: 'data.json' as const,
      dataJson: {
        title: 'Launch <Metrics>',
        owner: 'R&D & Ops',
        note: 'Use "quotes" and <tags> and \'apostrophes\'',
      },
    },
  };
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('live artifact store layout', () => {
  it('generates normalized live artifact slugs', () => {
    expect(generateLiveArtifactSlug(' Launch Metrics: Q2! ')).toBe('launch-metrics-q2');
    expect(generateLiveArtifactSlug('Crème brûlée dashboard')).toBe('creme-brulee-dashboard');
    expect(generateLiveArtifactSlug('---')).toBe('live-artifact');
    expect(generateLiveArtifactSlug('A'.repeat(200))).toHaveLength(128);
  });

  it('generates safe collision-resistant live artifact storage ids', () => {
    const id = generateLiveArtifactId({
      title: 'Launch Metrics: Q2!',
      randomSuffix: 'A1B2C3D4E5F6',
    });

    expect(id).toBe('la-launch-metrics-q2-a1b2c3d4e5f6');
    expect(validateLiveArtifactStorageId(id)).toBe(id);
    expect(generateLiveArtifactId({ title: 'Launch Metrics', randomSuffix: '000001' })).not.toBe(
      generateLiveArtifactId({ title: 'Launch Metrics', randomSuffix: '000002' }),
    );
  });

  it('uses normalized caller-provided slugs and keeps generated ids bounded', () => {
    const id = generateLiveArtifactId({
      title: 'Ignored title',
      slug: '../Custom Slug With Spaces/'.repeat(20),
      randomSuffix: 'abcdef123456',
    });

    expect(id).toMatch(/^la-custom-slug-with-spaces-custom-slug-with-spaces/);
    expect(id.endsWith('-abcdef123456')).toBe(true);
    expect(id.length).toBeLessThanOrEqual(128);
    expect(validateLiveArtifactStorageId(id)).toBe(id);
  });

  it('rejects invalid deterministic suffixes used by id generation tests', () => {
    expect(() => generateLiveArtifactId({ title: 'Launch Metrics', randomSuffix: '../bad' })).toThrow(
      /invalid live artifact id random suffix/,
    );
  });

  it('resolves and creates the project-scoped live artifact directory layout', async () => {
    const projectsRoot = await makeProjectsRoot();
    const paths = await ensureLiveArtifactStoreLayout(projectsRoot, 'project-1', 'artifact-1');

    expect(paths.projectDir).toBe(path.join(projectsRoot, 'project-1'));
    expect(paths.rootDir).toBe(path.join(projectsRoot, 'project-1', '.live-artifacts'));
    expect(paths.artifactDir).toBe(path.join(paths.rootDir, 'artifact-1'));
    expect(paths.artifactJsonPath).toBe(path.join(paths.artifactDir, 'artifact.json'));
    expect(paths.templateHtmlPath).toBe(path.join(paths.artifactDir, 'template.html'));
    expect(paths.dataJsonPath).toBe(path.join(paths.artifactDir, 'data.json'));
    expect(paths.provenanceJsonPath).toBe(path.join(paths.artifactDir, 'provenance.json'));
    expect(paths.refreshesJsonlPath).toBe(path.join(paths.artifactDir, 'refreshes.jsonl'));
    expect(paths.snapshotsDir).toBe(path.join(paths.artifactDir, 'snapshots'));
    expect(liveArtifactTilePath(paths, 'tile-1')).toBe(path.join(paths.artifactDir, 'tiles', 'tile-1.json'));

    await expect(stat(paths.tilesDir)).resolves.toMatchObject({});
    await expect(stat(paths.snapshotsDir)).resolves.toMatchObject({});
    await expect(readFile(paths.refreshesJsonlPath, 'utf8')).resolves.toBe('');
  });

  it('keeps live artifact storage under the configured projects root', async () => {
    const projectsRoot = path.join(await makeProjectsRoot(), 'custom-data-root', 'projects');
    const paths = liveArtifactStorePaths(projectsRoot, 'project-1', 'artifact-1');

    expect(paths.artifactDir).toBe(
      path.join(projectsRoot, 'project-1', '.live-artifacts', 'artifact-1'),
    );
  });

  it('rejects artifact and tile ids that could escape the storage root', async () => {
    const projectsRoot = await makeProjectsRoot();
    const paths = await ensureLiveArtifactStoreLayout(projectsRoot, 'project-1', 'artifact-1');

    expect(() => liveArtifactStorePaths(projectsRoot, 'project-1', '../artifact')).toThrow(/invalid live artifact id/);
    expect(() => liveArtifactStorePaths(projectsRoot, 'project-1', '/artifact')).toThrow(/invalid live artifact id/);
    expect(() => liveArtifactStorePaths(projectsRoot, '../project-1', 'artifact-1')).toThrow(/invalid project id/);
    expect(() => liveArtifactStorePaths(projectsRoot, '/project-1', 'artifact-1')).toThrow(/invalid project id/);
    expect(() => liveArtifactTilePath(paths, '../tile')).toThrow(/invalid live artifact id/);
    expect(() => liveArtifactTilePath(paths, '/tile')).toThrow(/invalid live artifact id/);
  });

  it('rejects absolute and traversal paths from generic project file payloads', async () => {
    const projectsRoot = await makeProjectsRoot();
    await ensureLiveArtifactStoreLayout(projectsRoot, 'project-1', 'artifact-1');

    await expect(writeProjectFile(projectsRoot, 'project-1', '/absolute.txt', Buffer.from('x'))).rejects.toThrow(
      /invalid file name/,
    );
    await expect(writeProjectFile(projectsRoot, 'project-1', '\\absolute.txt', Buffer.from('x'))).rejects.toThrow(
      /invalid file name/,
    );
    await expect(writeProjectFile(projectsRoot, 'project-1', 'nested/../secret.txt', Buffer.from('x'))).rejects.toThrow(
      /invalid file name/,
    );
  });

  it('excludes .live-artifacts from generic project file reads, writes, deletes, and listings', async () => {
    const projectsRoot = await makeProjectsRoot();
    const paths = await ensureLiveArtifactStoreLayout(projectsRoot, 'project-1', 'artifact-1');

    await writeProjectFile(projectsRoot, 'project-1', 'public.txt', Buffer.from('visible'));
    await writeProjectFile(projectsRoot, 'project-1', paths.artifactJsonPath.slice(paths.projectDir.length + 1), Buffer.from('{}'))
      .then(
        () => Promise.reject(new Error('reserved write unexpectedly succeeded')),
        (error) => expect(String(error)).toContain('reserved project path'),
      );

    await expect(readProjectFile(projectsRoot, 'project-1', '.live-artifacts/artifact-1/artifact.json')).rejects.toThrow(
      /reserved project path/,
    );
    await expect(deleteProjectFile(projectsRoot, 'project-1', '.live-artifacts/artifact-1/artifact.json')).rejects.toThrow(
      /reserved project path/,
    );

    const files = await listFiles(projectsRoot, 'project-1');
    expect(files.map((file) => file.path)).toEqual(['public.txt']);
    await expect(readdir(paths.rootDir)).resolves.toEqual(['artifact-1']);
  });

  it('creates a live artifact by assigning daemon-owned fields and persisting artifact files', async () => {
    const projectsRoot = await makeProjectsRoot();
    const now = new Date('2026-04-30T10:11:12.345Z');
    const input = validCreateInput();
    const templateHtml = [
      '<!doctype html>',
      '<html>',
      '  <body>',
      '    <h1>{{data.title}}</h1>',
      '    <p>{{data.owner}}</p>',
      '    <div>{{data.note}}</div>',
      '  </body>',
      '</html>',
      '',
    ].join('\n');
    const provenanceJson = {
      generatedAt: '2026-04-30T10:11:12.345Z',
      generatedBy: 'agent' as const,
      notes: 'Explicit provenance',
      sources: [{ label: 'User prompt', type: 'user_input' as const }],
    };

    const record = await createLiveArtifact({
      projectsRoot,
      projectId: 'project-1',
      input,
      templateHtml,
      provenanceJson,
      createdByRunId: 'run-123',
      now,
    });

    expect(record.artifact).toMatchObject({
      schemaVersion: 1,
      projectId: 'project-1',
      sessionId: 'session-123',
      createdByRunId: 'run-123',
      title: input.title,
      slug: 'launch-metrics-q2',
      status: 'archived',
      pinned: true,
      preview: input.preview,
      refreshStatus: 'never',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      tiles: input.tiles,
      document: input.document,
    });
    expect(record.artifact.id).toMatch(/^la-launch-metrics-q2-[a-f0-9]{12}$/);

    expect(await readFile(record.paths.artifactJsonPath, 'utf8')).toBe(`${JSON.stringify(record.artifact, null, 2)}\n`);
    expect(await readFile(record.paths.templateHtmlPath, 'utf8')).toBe(templateHtml);
    expect(await readFile(record.paths.dataJsonPath, 'utf8')).toBe(`${JSON.stringify(input.document.dataJson, null, 2)}\n`);
    expect(await readFile(record.paths.provenanceJsonPath, 'utf8')).toBe(`${JSON.stringify(provenanceJson, null, 2)}\n`);
    expect(await readFile(liveArtifactTilePath(record.paths, 'tile-1'), 'utf8')).toBe(
      `${JSON.stringify(input.tiles[0], null, 2)}\n`,
    );
    expect(await readFile(record.paths.refreshesJsonlPath, 'utf8')).toBe('');
    await expect(stat(record.paths.snapshotsDir)).resolves.toMatchObject({});
    await expect(readdir(record.paths.tilesDir)).resolves.toEqual(['tile-1.json']);

    expect(await readFile(record.paths.generatedPreviewHtmlPath, 'utf8')).toContain(
      '<h1>Launch &lt;Metrics&gt;</h1>',
    );
    expect(await readFile(record.paths.generatedPreviewHtmlPath, 'utf8')).toContain('<p>R&amp;D &amp; Ops</p>');
    expect(await readFile(record.paths.generatedPreviewHtmlPath, 'utf8')).toContain(
      '<div>Use &quot;quotes&quot; and &lt;tags&gt; and &#39;apostrophes&#39;</div>',
    );
  });

  it('lists compact live artifact summaries without exposing implementation files', async () => {
    const projectsRoot = await makeProjectsRoot();
    const older = await createLiveArtifact({
      projectsRoot,
      projectId: 'project-1',
      input: validCreateInput(),
      now: new Date('2026-04-30T10:11:12.345Z'),
    });
    const newer = await createLiveArtifact({
      projectsRoot,
      projectId: 'project-1',
      input: {
        ...validCreateInput(),
        title: 'Current Health',
        slug: 'current-health',
        tiles: [],
        document: undefined,
      },
      now: new Date('2026-04-30T10:12:12.345Z'),
    });

    const summaries = await listLiveArtifacts({ projectsRoot, projectId: 'project-1' });

    expect(summaries.map((artifact) => artifact.id)).toEqual([newer.artifact.id, older.artifact.id]);
    expect(summaries[0]).toMatchObject({
      id: newer.artifact.id,
      projectId: 'project-1',
      title: 'Current Health',
      tileCount: 0,
      hasDocument: false,
    });
    expect(summaries[1]).toMatchObject({
      id: older.artifact.id,
      tileCount: 1,
      hasDocument: true,
    });
    expect(summaries[0]).not.toHaveProperty('document');
    expect(summaries[0]).not.toHaveProperty('tiles');
    expect(JSON.stringify(summaries)).not.toContain('snapshots');
    expect(JSON.stringify(summaries)).not.toContain('template.html');
    expect(JSON.stringify(summaries)).not.toContain('data.json');
  });

  it('gets a full project-scoped live artifact record by id with data.json as source of truth', async () => {
    const projectsRoot = await makeProjectsRoot();
    const created = await createLiveArtifact({
      projectsRoot,
      projectId: 'project-1',
      input: validCreateInput(),
      now: new Date('2026-04-30T10:11:12.345Z'),
    });
    const diskDataJson = { title: 'Disk Title', owner: 'Disk Owner', note: 'From data.json' };
    await writeFile(created.paths.dataJsonPath, `${JSON.stringify(diskDataJson, null, 2)}\n`, 'utf8');

    const record = await getLiveArtifact({
      projectsRoot,
      projectId: 'project-1',
      artifactId: created.artifact.id,
    });

    expect(record.artifact).toEqual({
      ...created.artifact,
      document: { ...created.artifact.document!, dataJson: diskDataJson },
    });
    expect(record.paths).toEqual(created.paths);
    expect(record.artifact.tiles).toHaveLength(1);
    expect(record.artifact.document).toMatchObject({
      format: 'html_template_v1',
      templatePath: 'template.html',
      generatedPreviewPath: 'index.html',
      dataPath: 'data.json',
    });
  });

  it('regenerates preview HTML from template.html and data.json as the source of truth', async () => {
    const projectsRoot = await makeProjectsRoot();
    const created = await createLiveArtifact({
      projectsRoot,
      projectId: 'project-1',
      input: validCreateInput(),
      templateHtml: '<h1>{{data.title}}</h1><p>{{data.owner}}</p>',
    });

    await writeFile(created.paths.dataJsonPath, `${JSON.stringify({ title: 'Disk <Title>', owner: 'Disk & Owner' }, null, 2)}\n`, 'utf8');

    const rendered = await regenerateLiveArtifactPreview({
      projectsRoot,
      projectId: 'project-1',
      artifactId: created.artifact.id,
    });

    expect(rendered.html).toBe('<h1>Disk &lt;Title&gt;</h1><p>Disk &amp; Owner</p>');
    expect(await readFile(created.paths.generatedPreviewHtmlPath, 'utf8')).toBe(rendered.html);
  });

  it('regenerates missing derived preview output when needed', async () => {
    const projectsRoot = await makeProjectsRoot();
    const created = await createLiveArtifact({
      projectsRoot,
      projectId: 'project-1',
      input: validCreateInput(),
      templateHtml: '<h1>{{data.title}}</h1>',
    });
    await rm(created.paths.generatedPreviewHtmlPath, { force: true });

    const preview = await ensureLiveArtifactPreview({
      projectsRoot,
      projectId: 'project-1',
      artifactId: created.artifact.id,
    });

    expect(preview.html).toBe('<h1>Launch &lt;Metrics&gt;</h1>');
    expect(await readFile(created.paths.generatedPreviewHtmlPath, 'utf8')).toBe(preview.html);
  });

  it('updates mutable live artifact presentation fields without changing daemon-owned fields', async () => {
    const projectsRoot = await makeProjectsRoot();
    const created = await createLiveArtifact({
      projectsRoot,
      projectId: 'project-1',
      input: validCreateInput(),
      createdByRunId: 'run-123',
      now: new Date('2026-04-30T10:11:12.345Z'),
    });

    const originalTile = created.artifact.tiles[0]!;
    const updatedTile = {
      ...originalTile,
      title: 'Updated Revenue',
      renderJson: { type: 'metric' as const, label: 'Updated Revenue', value: 42, tone: 'good' as const },
      sourceJson: {
        type: 'local_file' as const,
        input: { path: 'metrics.json' },
        refreshPermission: 'none' as const,
      },
    };
    const updatedDocument = {
      ...created.artifact.document!,
      dataJson: { title: 'Updated <Title>', owner: 'Ops' },
      sourceJson: {
        type: 'daemon_tool' as const,
        toolName: 'project_files.read_json',
        input: { file: 'metrics.json' },
        refreshPermission: 'none' as const,
      },
    };

    const record = await updateLiveArtifact({
      projectsRoot,
      projectId: 'project-1',
      artifactId: created.artifact.id,
      input: {
        title: 'Updated Dashboard',
        slug: 'Updated Dashboard!',
        pinned: false,
        status: 'active',
        preview: { type: 'html', entry: 'index.html' },
        tiles: [updatedTile],
        document: updatedDocument,
      },
      now: new Date('2026-04-30T10:12:12.345Z'),
    });

    expect(record.artifact).toMatchObject({
      id: created.artifact.id,
      projectId: 'project-1',
      createdByRunId: 'run-123',
      schemaVersion: 1,
      title: 'Updated Dashboard',
      slug: 'updated-dashboard',
      pinned: false,
      status: 'active',
      refreshStatus: 'never',
      createdAt: '2026-04-30T10:11:12.345Z',
      updatedAt: '2026-04-30T10:12:12.345Z',
      tiles: [updatedTile],
      document: updatedDocument,
    });
    expect(await readFile(record.paths.dataJsonPath, 'utf8')).toBe(`${JSON.stringify(updatedDocument.dataJson, null, 2)}\n`);
    expect(await readFile(liveArtifactTilePath(record.paths, updatedTile.id), 'utf8')).toBe(
      `${JSON.stringify(updatedTile, null, 2)}\n`,
    );
    expect(await readFile(record.paths.generatedPreviewHtmlPath, 'utf8')).toContain('Updated &lt;Title&gt;');
  });

  it('rejects daemon-owned and run override fields in update input', async () => {
    const projectsRoot = await makeProjectsRoot();
    const created = await createLiveArtifact({
      projectsRoot,
      projectId: 'project-1',
      input: validCreateInput(),
    });

    await expect(
      updateLiveArtifact({
        projectsRoot,
        projectId: 'project-1',
        artifactId: created.artifact.id,
        input: {
          title: 'Should fail',
          id: 'other',
          projectId: 'other-project',
          run: 'run-override',
          runId: 'run-override',
          createdAt: '2026-04-30T10:11:12.345Z',
          updatedAt: '2026-04-30T10:11:12.345Z',
          createdByRunId: 'run-override',
          schemaVersion: 1,
          refreshStatus: 'running',
        },
      }),
    ).rejects.toMatchObject({
      name: 'LiveArtifactStoreValidationError',
      issues: expect.arrayContaining([
        expect.objectContaining({ path: 'id' }),
        expect.objectContaining({ path: 'projectId' }),
        expect.objectContaining({ path: 'run' }),
        expect.objectContaining({ path: 'runId' }),
        expect.objectContaining({ path: 'createdAt' }),
        expect.objectContaining({ path: 'updatedAt' }),
        expect.objectContaining({ path: 'createdByRunId' }),
        expect.objectContaining({ path: 'schemaVersion' }),
        expect.objectContaining({ path: 'refreshStatus' }),
      ]),
    });
  });

  it('rejects invalid ids and missing live artifacts during get', async () => {
    const projectsRoot = await makeProjectsRoot();

    await expect(
      getLiveArtifact({ projectsRoot, projectId: 'project-1', artifactId: '../artifact' }),
    ).rejects.toThrow(/invalid live artifact id/);
    await expect(
      getLiveArtifact({ projectsRoot, projectId: 'project-1', artifactId: 'missing-artifact' }),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('returns an empty live artifact list when the project has no live artifact storage', async () => {
    const projectsRoot = await makeProjectsRoot();

    await expect(listLiveArtifacts({ projectsRoot, projectId: 'project-1' })).resolves.toEqual([]);
  });

  it('rejects daemon-owned fields in create input', async () => {
    const projectsRoot = await makeProjectsRoot();

    await expect(
      createLiveArtifact({
        projectsRoot,
        projectId: 'project-1',
        input: {
          ...validCreateInput(),
          id: 'artifact-1',
          projectId: 'other-project',
          createdAt: '2026-04-30T10:11:12.345Z',
          updatedAt: '2026-04-30T10:11:12.345Z',
          createdByRunId: 'run-123',
          schemaVersion: 99,
          refreshStatus: 'running',
          lastRefreshedAt: '2026-04-30T10:11:12.345Z',
        },
      }),
    ).rejects.toMatchObject({
      name: 'LiveArtifactStoreValidationError',
      issues: expect.arrayContaining([
        expect.objectContaining({ path: 'id' }),
        expect.objectContaining({ path: 'projectId' }),
        expect.objectContaining({ path: 'createdAt' }),
        expect.objectContaining({ path: 'updatedAt' }),
        expect.objectContaining({ path: 'createdByRunId' }),
        expect.objectContaining({ path: 'schemaVersion' }),
        expect.objectContaining({ path: 'refreshStatus' }),
        expect.objectContaining({ path: 'lastRefreshedAt' }),
      ]),
    });
  });
});
