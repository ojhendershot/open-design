// Plan §3.F4 / spec §8 e2e-3 anchor.
//
// Verifies the headless `od plugin install → project create → run start`
// loop end-to-end at the HTTP layer (the same paths the CLI subcommands
// from §3.F1 / §3.F2 hit). Without an actual agent backend we can't
// assert "first ND-JSON event has kind='pipeline_stage_started'" — that
// requires the run-time pipeline runner being wired into the live agent
// loop. What we can lock today:
//
//   1. POST /api/plugins/install (local fixture) succeeds.
//   2. POST /api/projects { pluginId, pluginInputs } → 200 +
//      appliedPluginSnapshotId pinned to the new project.
//   3. POST /api/runs { projectId, pluginId, pluginInputs } → 202 +
//      runId.
//   4. GET /api/runs/:id surfaces appliedPluginSnapshotId on the run
//      status body so a code agent that polled status (rather than
//      streaming events) can still reach the snapshot id.
//   5. POST /api/applied-plugins/:id is fetchable and returns the same
//      snapshot a replay would re-launch against.
//
// Once the pipeline runner is wired into startChatRun (deferred to the
// Phase 1 follow-up that lands a fully-driven agent loop), this test
// gets extended to assert the first SSE event is `pipeline_stage_started`.

import type http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import url from 'node:url';
import { startServer } from '../src/server.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'plugin-fixtures', 'sample-plugin');

let server: http.Server;
let baseUrl: string;
let shutdown: (() => Promise<void> | void) | undefined;

beforeAll(async () => {
  const started = (await startServer({ port: 0, returnServer: true })) as {
    url: string;
    server: http.Server;
    shutdown?: () => Promise<void> | void;
  };
  baseUrl = started.url;
  server = started.server;
  shutdown = started.shutdown;
});

afterAll(async () => {
  await Promise.resolve(shutdown?.());
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function readSseUntilSuccess(resp: Response) {
  if (!resp.body) throw new Error('install: no body');
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    for (const block of blocks) {
      const eventLine = block.split('\n').find((l) => l.startsWith('event: '));
      const dataLine  = block.split('\n').find((l) => l.startsWith('data: '));
      const event = eventLine ? eventLine.slice('event: '.length) : '';
      const data  = dataLine  ? JSON.parse(dataLine.slice('data: '.length)) : null;
      if (event === 'success') return data;
      if (event === 'error') throw new Error(data?.message ?? 'install failed');
    }
  }
  throw new Error('install stream ended without success');
}

describe('Plan §8 e2e-3 (entry slice) — headless install → project → run', () => {
  it('walks install → project create → run start → status with snapshot pinned', async () => {
    // 1. Install a local fixture plugin via the SSE install endpoint.
    const installResp = await fetch(`${baseUrl}/api/plugins/install`, {
      method:  'POST',
      headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
      body:    JSON.stringify({ source: FIXTURE_DIR }),
    });
    expect(installResp.status).toBe(200);
    const installSuccess = await readSseUntilSuccess(installResp);
    expect(installSuccess?.plugin?.id).toBe('sample-plugin');

    // 2. Create a project bound to the plugin.
    const projectId = `headless-${Date.now()}`;
    const createResp = await fetch(`${baseUrl}/api/projects`, {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({
        id:           projectId,
        name:         'Headless e2e-3',
        pluginId:     'sample-plugin',
        pluginInputs: { topic: 'agentic design' },
      }),
    });
    expect(createResp.status).toBe(200);
    const createBody = (await createResp.json()) as {
      project: { id: string };
      conversationId: string;
      appliedPluginSnapshotId?: string;
    };
    expect(createBody.project.id).toBe(projectId);
    expect(createBody.appliedPluginSnapshotId).toBeTruthy();

    // 3. Start a run that re-uses the same applied snapshot id.
    const runResp = await fetch(`${baseUrl}/api/runs`, {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({
        projectId,
        pluginId:                 'sample-plugin',
        appliedPluginSnapshotId:  createBody.appliedPluginSnapshotId,
        pluginInputs:             { topic: 'agentic design' },
      }),
    });
    expect(runResp.status).toBe(202);
    const runBody = (await runResp.json()) as { runId: string };
    expect(runBody.runId).toBeTruthy();

    // 4. The run status surfaces the snapshot id so a polling client
    // can reach replay without parsing the SSE stream.
    const statusResp = await fetch(`${baseUrl}/api/runs/${encodeURIComponent(runBody.runId)}`);
    expect(statusResp.status).toBe(200);
    const statusBody = (await statusResp.json()) as {
      id: string;
      projectId: string;
      pluginId: string | null;
      appliedPluginSnapshotId: string | null;
    };
    expect(statusBody.pluginId).toBe('sample-plugin');
    expect(statusBody.appliedPluginSnapshotId).toBe(createBody.appliedPluginSnapshotId);

    // 5. Replay reads the same snapshot row.
    const snapResp = await fetch(`${baseUrl}/api/applied-plugins/${encodeURIComponent(createBody.appliedPluginSnapshotId!)}`);
    expect(snapResp.status).toBe(200);
    const snap = (await snapResp.json()) as { snapshotId: string; pluginId: string };
    expect(snap.snapshotId).toBe(createBody.appliedPluginSnapshotId);
    expect(snap.pluginId).toBe('sample-plugin');

    // Cancel the run so the test cleans up the in-memory child path.
    await fetch(`${baseUrl}/api/runs/${encodeURIComponent(runBody.runId)}/cancel`, { method: 'POST' });
  });

  // Full §8 e2e-3 contract — once the pipeline runner fires on a run
  // with a declared pipeline, the first ND-JSON event should be
  // `pipeline_stage_started`. Plan §3.I1 wires firePipelineForRun into
  // POST /api/runs so any plugin run with `od.pipeline.stages[*]`
  // emits the stage timeline before the agent's message_chunk stream.
  it('first SSE event on a plugin run with od.pipeline is pipeline_stage_started', async () => {
    // Install a fixture plugin with a 2-stage pipeline. We use a
    // disposable manifest rather than the on-disk fixture so the
    // pipeline shape is locked here.
    const fs = await import('node:fs/promises');
    const os = await import('node:os');
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'od-headless-pipeline-'));
    const fixture = path.join(tmpRoot, 'pipeline-plugin');
    await fs.mkdir(fixture, { recursive: true });
    await fs.writeFile(
      path.join(fixture, 'open-design.json'),
      JSON.stringify({
        $schema: 'https://open-design.ai/schemas/plugin.v1.json',
        name: 'pipeline-plugin',
        title: 'Pipeline Plugin',
        version: '1.0.0',
        description: 'fixture with a declared pipeline',
        license: 'MIT',
        od: {
          kind: 'skill',
          taskKind: 'new-generation',
          useCase: { query: 'Make a {{topic}} brief.' },
          inputs: [{ name: 'topic', type: 'string', required: true, label: 'Topic' }],
          pipeline: {
            stages: [
              { id: 'discovery', atoms: ['discovery-question-form'] },
              { id: 'plan',      atoms: ['todo-write'] },
            ],
          },
          capabilities: ['prompt:inject'],
        },
      }, null, 2),
    );
    await fs.writeFile(
      path.join(fixture, 'SKILL.md'),
      '---\nname: pipeline-plugin\ndescription: fixture with pipeline\n---\n# Pipeline\n',
    );

    const installResp = await fetch(`${baseUrl}/api/plugins/install`, {
      method:  'POST',
      headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
      body:    JSON.stringify({ source: fixture }),
    });
    await readSseUntilSuccess(installResp);

    const projectId = `pipeline-${Date.now()}`;
    // The fixture declares od.pipeline.stages and is installed under
    // sourceKind='local' (default trust='restricted'). The required
    // capabilities therefore include pipeline:*; the test grants it
    // ephemerally via the resolver so the snapshot is created without
    // re-asking the user.
    const createResp = await fetch(`${baseUrl}/api/projects`, {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({
        id:           projectId,
        name:         'Pipeline e2e-3',
        pluginId:     'pipeline-plugin',
        pluginInputs: { topic: 'agentic design' },
        grantCaps:    ['pipeline:*'],
      }),
    });
    expect(createResp.status).toBe(200);
    const createBody = (await createResp.json()) as {
      project: { id: string };
      conversationId: string;
      appliedPluginSnapshotId?: string;
    };
    expect(createBody.appliedPluginSnapshotId).toBeTruthy();

    const runResp = await fetch(`${baseUrl}/api/runs`, {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({
        projectId,
        pluginId:                'pipeline-plugin',
        appliedPluginSnapshotId: createBody.appliedPluginSnapshotId,
        grantCaps:               ['pipeline:*'],
      }),
    });
    expect(runResp.status).toBe(202);
    const runBody = (await runResp.json()) as { runId: string };

    // The pipeline emits its first event synchronously inside POST
    // /api/runs (firePipelineForRun runs before design.runs.start
    // schedules the agent), so by the time we GET /api/runs/:id/events
    // the run buffer already contains pipeline_stage_started.
    // Wait briefly for the async tail (devloop iteration log) to settle.
    await new Promise((r) => setTimeout(r, 30));

    const statusResp = await fetch(`${baseUrl}/api/runs/${encodeURIComponent(runBody.runId)}`);
    const statusBody = (await statusResp.json()) as { id: string };
    expect(statusBody.id).toBe(runBody.runId);

    // Read the run's event buffer through the SSE stream — the
    // server pipes every record through res.write, so reading the
    // body until 'end' or pipeline_stage_completed surfaces the
    // first events. We don't actually wait for end (the run is
    // long-running); we just look for the stage-start anchor.
    const eventsResp = await fetch(`${baseUrl}/api/runs/${encodeURIComponent(runBody.runId)}/events`, {
      headers: { accept: 'text/event-stream' },
    });
    expect(eventsResp.body).toBeTruthy();
    const reader = eventsResp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let firstStageEvent: string | null = null;
    let messageChunkSeen = false;
    const start = Date.now();
    while (Date.now() - start < 1500) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';
      for (const block of blocks) {
        const eventLine = block.split('\n').find((l) => l.startsWith('event: '));
        if (!eventLine) continue;
        const event = eventLine.slice('event: '.length);
        if (event === 'pipeline_stage_started' && !firstStageEvent && !messageChunkSeen) {
          firstStageEvent = event;
        }
        if (event === 'message_chunk') messageChunkSeen = true;
        if (firstStageEvent || event === 'end') break;
      }
      if (firstStageEvent) break;
    }
    void reader.cancel().catch(() => undefined);

    expect(firstStageEvent).toBe('pipeline_stage_started');

    await fetch(`${baseUrl}/api/runs/${encodeURIComponent(runBody.runId)}/cancel`, { method: 'POST' });
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });
});
