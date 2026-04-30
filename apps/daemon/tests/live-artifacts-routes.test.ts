// @ts-nocheck
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startServer } from '../src/server.js';
import { CHAT_TOOL_ENDPOINTS, CHAT_TOOL_OPERATIONS, toolTokenRegistry } from '../src/tool-tokens.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '../../..');

let server;
let baseUrl;
const projectIds = [];

beforeEach(async () => {
  const started = await startServer({ port: 0, returnServer: true });
  server = started.server;
  baseUrl = started.url;
});

afterEach(async () => {
  await new Promise((resolve, reject) => {
    if (!server) return resolve(undefined);
    server.close((error) => (error ? reject(error) : resolve(undefined)));
  });
  server = undefined;
  toolTokenRegistry.clear();
  await Promise.all(
    projectIds.splice(0).map((projectId) =>
      rm(path.join(projectRoot, '.od', 'projects', projectId), { recursive: true, force: true }),
    ),
  );
});

function uniqueProjectId() {
  const id = `route-live-artifact-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  projectIds.push(id);
  return id;
}

function validCreateInput(title = 'Tool Route Live Artifact') {
  return {
    title,
    preview: { type: 'html', entry: 'index.html' },
    document: {
      format: 'html_template_v1',
      templatePath: 'template.html',
      generatedPreviewPath: 'index.html',
      dataPath: 'data.json',
      dataJson: { title, owner: 'Agent' },
    },
  };
}

async function jsonFetch(url, init) {
  const response = await fetch(url, init);
  return { status: response.status, body: await response.json() };
}

function mintToolToken(projectId, runId, overrides = {}) {
  return toolTokenRegistry.mint({
    projectId,
    runId,
    allowedEndpoints: CHAT_TOOL_ENDPOINTS,
    allowedOperations: CHAT_TOOL_OPERATIONS,
    ...overrides,
  }).token;
}

describe('live artifact tool routes', () => {
  it('creates and lists live artifacts for agent registration', async () => {
    const projectId = uniqueProjectId();
    const runId = 'run-route-test';
    const token = mintToolToken(projectId, runId);
    const create = await jsonFetch(`${baseUrl}/api/tools/live-artifacts/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        input: validCreateInput(),
        templateHtml: '<!doctype html><h1>{{data.title}}</h1><p>{{data.owner}}</p>',
        provenanceJson: {
          generatedAt: '2026-04-30T00:00:00.000Z',
          generatedBy: 'agent',
          sources: [{ label: 'Route test', type: 'user_input' }],
        },
      }),
    });

    expect(create.status).toBe(200);
    expect(create.body.artifact).toMatchObject({
      projectId,
      title: 'Tool Route Live Artifact',
      createdByRunId: runId,
      refreshStatus: 'never',
    });

    const list = await jsonFetch(`${baseUrl}/api/tools/live-artifacts/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(list.status).toBe(200);
    expect(list.body.artifacts).toHaveLength(1);
    expect(list.body.artifacts[0]).toMatchObject({
      id: create.body.artifact.id,
      projectId,
      title: 'Tool Route Live Artifact',
      hasDocument: true,
      tileCount: 0,
    });
    expect(list.body.artifacts[0].document).toBeUndefined();
    expect(list.body.artifacts[0].tiles).toBeUndefined();
  });

  it('returns shared API validation errors from tool create', async () => {
    const projectId = uniqueProjectId();
    const token = mintToolToken(projectId, 'run-route-test-validation');
    const create = await jsonFetch(`${baseUrl}/api/tools/live-artifacts/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ input: { title: '' } }),
    });

    expect(create.status).toBe(400);
    expect(create.body.error).toMatchObject({
      code: 'LIVE_ARTIFACT_INVALID',
      details: { kind: 'validation' },
    });
  });

  it('rejects missing bearer token', async () => {
    const create = await jsonFetch(`${baseUrl}/api/tools/live-artifacts/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: validCreateInput() }),
    });

    expect(create.status).toBe(401);
    expect(create.body.error).toMatchObject({
      code: 'TOOL_TOKEN_MISSING',
      details: {
        endpoint: '/api/tools/live-artifacts/create',
        operation: 'live-artifacts:create',
      },
    });
  });

  it('rejects projectId overrides from the request body', async () => {
    const projectId = uniqueProjectId();
    const token = mintToolToken(projectId, 'run-route-test-project-override');
    const create = await jsonFetch(`${baseUrl}/api/tools/live-artifacts/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        projectId: 'different-project-id',
        input: validCreateInput(),
      }),
    });

    expect(create.status).toBe(403);
    expect(create.body.error).toMatchObject({
      code: 'FORBIDDEN',
      details: { suppliedProjectId: 'different-project-id' },
    });
  });

  it('rejects tokens that are not allowed to access the endpoint', async () => {
    const projectId = uniqueProjectId();
    const token = mintToolToken(projectId, 'run-route-test-endpoint-denied', {
      allowedEndpoints: ['/api/tools/live-artifacts/create'],
    });

    const list = await jsonFetch(`${baseUrl}/api/tools/live-artifacts/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(list.status).toBe(403);
    expect(list.body.error).toMatchObject({
      code: 'TOOL_ENDPOINT_DENIED',
      details: {
        endpoint: '/api/tools/live-artifacts/list',
        operation: 'live-artifacts:list',
      },
    });
  });

  it('rejects tokens that are not allowed to perform the operation', async () => {
    const projectId = uniqueProjectId();
    const token = mintToolToken(projectId, 'run-route-test-operation-denied', {
      allowedEndpoints: ['/api/tools/live-artifacts/list'],
      allowedOperations: ['live-artifacts:create'],
    });

    const list = await jsonFetch(`${baseUrl}/api/tools/live-artifacts/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(list.status).toBe(403);
    expect(list.body.error).toMatchObject({
      code: 'TOOL_OPERATION_DENIED',
      details: {
        endpoint: '/api/tools/live-artifacts/list',
        operation: 'live-artifacts:list',
      },
    });
  });
});
