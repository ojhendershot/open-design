// @ts-nocheck
import { rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startServer } from '../src/server.js';
import { CHAT_TOOL_ENDPOINTS, CHAT_TOOL_OPERATIONS, toolTokenRegistry } from '../src/tool-tokens.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '../../..');
const serverRuntimeDataRoot = path.join(projectRoot, 'apps', '.od');

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
  const cleanupProjectIds = projectIds.splice(0);
  await Promise.all(
    cleanupProjectIds.flatMap((projectId) => [
      rm(path.join(projectRoot, '.od', 'projects', projectId), { recursive: true, force: true }),
      rm(path.join(serverRuntimeDataRoot, 'projects', projectId), { recursive: true, force: true }),
    ]),
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

async function textFetch(url, init) {
  const response = await fetch(url, init);
  return { status: response.status, headers: response.headers, body: await response.text() };
}

async function rawHttpJsonFetch(url, { headers = {} } = {}) {
  const parsed = new URL(url);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method: 'GET',
        headers,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
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

  it('serves live artifact previews with restrictive iframe headers', async () => {
    const projectId = uniqueProjectId();
    const token = mintToolToken(projectId, 'run-route-test-preview');
    const create = await jsonFetch(`${baseUrl}/api/tools/live-artifacts/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        input: validCreateInput('Preview Route Artifact'),
        templateHtml: '<!doctype html><html><body><h1>{{data.title}}</h1><p>{{data.owner}}</p></body></html>',
      }),
    });

    expect(create.status).toBe(200);
    const preview = await textFetch(`${baseUrl}/api/live-artifacts/${create.body.artifact.id}/preview?projectId=${encodeURIComponent(projectId)}`);

    expect(preview.status).toBe(200);
    expect(preview.headers.get('content-type')).toContain('text/html');
    expect(preview.headers.get('x-content-type-options')).toBe('nosniff');
    expect(preview.headers.get('referrer-policy')).toBe('no-referrer');
    expect(preview.headers.get('access-control-allow-origin')).toBeNull();
    expect(preview.headers.get('vary')).toContain('Origin');
    const csp = preview.headers.get('content-security-policy') || '';
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain('sandbox allow-same-origin');
    expect(preview.body).toContain('<h1>Preview Route Artifact</h1>');
    expect(preview.body).toContain('<p>Agent</p>');
  });

  it('returns API dataJson from data.json when the artifact cache diverges', async () => {
    const projectId = uniqueProjectId();
    const token = mintToolToken(projectId, 'run-route-test-data-json-source');
    const create = await jsonFetch(`${baseUrl}/api/tools/live-artifacts/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        input: validCreateInput('API Cache Artifact'),
        templateHtml: '<!doctype html><h1>{{data.title}}</h1><p>{{data.owner}}</p>',
      }),
    });

    expect(create.status).toBe(200);
    const diskDataJson = { title: 'Disk API Title', owner: 'data.json owner' };
    await writeFile(
      path.join(projectRoot, '.od', 'projects', projectId, '.live-artifacts', create.body.artifact.id, 'data.json'),
      `${JSON.stringify(diskDataJson, null, 2)}\n`,
      'utf8',
    ).catch(async (error) => {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT') throw error;
      await writeFile(
        path.join(serverRuntimeDataRoot, 'projects', projectId, '.live-artifacts', create.body.artifact.id, 'data.json'),
        `${JSON.stringify(diskDataJson, null, 2)}\n`,
        'utf8',
      );
    });

    const detail = await jsonFetch(`${baseUrl}/api/live-artifacts/${create.body.artifact.id}?projectId=${encodeURIComponent(projectId)}`);
    const preview = await textFetch(`${baseUrl}/api/live-artifacts/${create.body.artifact.id}/preview?projectId=${encodeURIComponent(projectId)}`);

    expect(detail.status).toBe(200);
    expect(detail.body.artifact.document.dataJson).toEqual(diskDataJson);
    expect(preview.status).toBe(200);
    expect(preview.body).toContain('<h1>Disk API Title</h1>');
    expect(preview.body).toContain('<p>data.json owner</p>');
  });

  it('rejects preview requests with non-loopback host or origin headers', async () => {
    const projectId = uniqueProjectId();
    const token = mintToolToken(projectId, 'run-route-test-preview-local-security');
    const create = await jsonFetch(`${baseUrl}/api/tools/live-artifacts/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        input: validCreateInput('Preview Local Security'),
        templateHtml: '<!doctype html><h1>{{data.title}}</h1>',
      }),
    });

    expect(create.status).toBe(200);
    const previewUrl = `${baseUrl}/api/live-artifacts/${create.body.artifact.id}/preview?projectId=${encodeURIComponent(projectId)}`;

    const rejectedHost = await rawHttpJsonFetch(previewUrl, { headers: { Host: 'attacker.example' } });
    expect(rejectedHost.status).toBe(403);
    expect(rejectedHost.body.error).toMatchObject({
      code: 'FORBIDDEN',
      details: { header: 'host' },
    });

    const rejectedOrigin = await jsonFetch(previewUrl, { headers: { Origin: 'https://attacker.example' } });
    expect(rejectedOrigin.status).toBe(403);
    expect(rejectedOrigin.body.error).toMatchObject({
      code: 'FORBIDDEN',
      details: { header: 'origin' },
    });
  });

  it('allows loopback-origin preview preflight without opening broad CORS', async () => {
    const projectId = uniqueProjectId();
    const response = await fetch(`${baseUrl}/api/live-artifacts/unused/preview?projectId=${encodeURIComponent(projectId)}`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:17573' },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:17573');
    expect(response.headers.get('access-control-allow-methods')).toBe('GET, OPTIONS');
    expect(response.headers.get('access-control-allow-origin')).not.toBe('*');
  });

  it('rejects executable script in persisted render JSON', async () => {
    const projectId = uniqueProjectId();
    const token = mintToolToken(projectId, 'run-route-test-render-json-script');
    const create = await jsonFetch(`${baseUrl}/api/tools/live-artifacts/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        input: {
          ...validCreateInput('Unsafe Render JSON'),
          tiles: [
            {
              id: 'unsafe-tile',
              kind: 'markdown',
              title: 'Unsafe tile',
              renderJson: { type: 'markdown', markdown: '<script>alert(1)</script>' },
              provenanceJson: {
                generatedAt: '2026-04-30T00:00:00.000Z',
                generatedBy: 'agent',
                sources: [{ label: 'Route test', type: 'user_input' }],
              },
              refreshStatus: 'not_refreshable',
            },
          ],
        },
      }),
    });

    expect(create.status).toBe(400);
    expect(create.body.error).toMatchObject({
      code: 'LIVE_ARTIFACT_INVALID',
      details: { kind: 'validation' },
    });
    expect(JSON.stringify(create.body.error.details.issues)).toContain('script elements are not supported');
  });

  it('rejects executable script in template previews', async () => {
    const projectId = uniqueProjectId();
    const token = mintToolToken(projectId, 'run-route-test-template-script');
    const create = await jsonFetch(`${baseUrl}/api/tools/live-artifacts/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        input: validCreateInput('Unsafe Template'),
        templateHtml: '<!doctype html><h1>{{data.title}}</h1><script src="/evil.js"></script>',
      }),
    });

    expect(create.status).toBe(400);
    expect(create.body.error).toMatchObject({
      code: 'LIVE_ARTIFACT_INVALID',
      details: { kind: 'validation' },
    });
    expect(JSON.stringify(create.body.error.details.issues)).toContain('script elements are not supported');
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
