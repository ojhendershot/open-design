// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startServer } from '../src/server.js';
import { CHAT_TOOL_ENDPOINTS, CHAT_TOOL_OPERATIONS, toolTokenRegistry } from '../src/tool-tokens.js';

let server;
let baseUrl;

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
});

async function jsonFetch(url, init) {
  const response = await fetch(url, init);
  return { status: response.status, body: await response.json() };
}

function mintConnectorToolToken(projectId = 'connector-route-project', runId = 'connector-route-run', overrides = {}) {
  return toolTokenRegistry.mint({
    projectId,
    runId,
    allowedEndpoints: CHAT_TOOL_ENDPOINTS,
    allowedOperations: CHAT_TOOL_OPERATIONS,
    ...overrides,
  }).token;
}

describe('connector routes', () => {
  it('lists the built-in connectors', async () => {
    const response = await jsonFetch(`${baseUrl}/api/connectors`);

    expect(response.status).toBe(200);
    expect(response.body.connectors.map((connector) => connector.id)).toEqual(['project_files', 'git', 'github_public']);
  });

  it('returns connector detail and 404 for unknown connectors', async () => {
    const detail = await jsonFetch(`${baseUrl}/api/connectors/project_files`);

    expect(detail.status).toBe(200);
    expect(detail.body.connector).toMatchObject({
      id: 'project_files',
      name: 'Project files',
      status: 'connected',
    });

    const missing = await jsonFetch(`${baseUrl}/api/connectors/missing`);

    expect(missing.status).toBe(404);
    expect(missing.body).toMatchObject({
      error: {
        code: 'CONNECTOR_NOT_FOUND',
        message: 'connector not found',
      },
    });
  });

  it('connects and disconnects an existing connector', async () => {
    const connect = await jsonFetch(`${baseUrl}/api/connectors/git/connect`, { method: 'POST' });

    expect(connect.status).toBe(200);
    expect(connect.body.connector).toMatchObject({
      id: 'git',
      status: 'connected',
      accountLabel: 'Current repository',
    });

    const disconnect = await jsonFetch(`${baseUrl}/api/connectors/git/connection`, { method: 'DELETE' });

    expect(disconnect.status).toBe(200);
    expect(disconnect.body.connector).toMatchObject({
      id: 'git',
      status: 'connected',
      accountLabel: 'Current repository',
    });
  });

  it('lists connector tools through run-scoped tool auth', async () => {
    const token = mintConnectorToolToken();

    const response = await jsonFetch(`${baseUrl}/api/tools/connectors/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    expect(response.body.connectors.map((connector) => connector.id)).toEqual(['project_files', 'git', 'github_public']);
    expect(response.body.connectors[0]).toMatchObject({
      id: 'project_files',
      status: 'connected',
      tools: [
        { name: 'project_files.search', safety: { sideEffect: 'read', approval: 'auto' }, refreshEligible: true },
        { name: 'project_files.read_json', safety: { sideEffect: 'read', approval: 'auto' }, refreshEligible: true },
      ],
    });
  });

  it('executes connector tools through run-scoped tool auth', async () => {
    const token = mintConnectorToolToken('connector-execute-project', 'connector-execute-run');

    const response = await jsonFetch(`${baseUrl}/api/tools/connectors/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ connectorId: 'project_files', toolName: 'project_files.search', input: { query: 'missing' } }),
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      connectorId: 'project_files',
      accountLabel: 'Local project',
      toolName: 'project_files.search',
      safety: { sideEffect: 'read', approval: 'auto' },
    });
    expect(response.body.output).toMatchObject({ toolName: 'project_files.search', count: 0 });
  });

  it('rejects connector tool requests outside token scope', async () => {
    const listOnlyToken = mintConnectorToolToken('connector-scope-project', 'connector-scope-run', {
      allowedEndpoints: ['/api/tools/connectors/list'],
      allowedOperations: ['connectors:list'],
    });

    const execute = await jsonFetch(`${baseUrl}/api/tools/connectors/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${listOnlyToken}` },
      body: JSON.stringify({ connectorId: 'git', toolName: 'git.summary', input: {} }),
    });

    expect(execute.status).toBe(403);
    expect(execute.body.error.code).toBe('TOOL_ENDPOINT_DENIED');
  });
});
