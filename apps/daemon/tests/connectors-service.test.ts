import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

import {
  CONNECTOR_RUN_RATE_LIMIT_CALLS,
  CONNECTOR_RUN_TOTAL_CALL_LIMIT,
  ConnectorService,
  ConnectorServiceError,
  ConnectorStatusService,
  FileConnectorCredentialStore,
  type ConnectorExecuteRequest,
  type ConnectorExecutionContext,
} from '../src/connectors/service.js';
import {
  classifyConnectorToolSafety,
  isRefreshEligibleConnectorToolSafety,
  type ConnectorCatalogDefinition,
} from '../src/connectors/catalog.js';
import type { BoundedJsonObject } from '../src/live-artifacts/schema.js';

function externalConnector(overrides: Partial<ConnectorCatalogDefinition> = {}): ConnectorCatalogDefinition {
  return {
    id: 'external_docs',
    name: 'External docs',
    provider: 'example',
    category: 'docs',
    tools: [],
    allowedToolNames: [],
    ...overrides,
  };
}

class TestConnectorService extends ConnectorService {
  constructor(
    private readonly definition: ConnectorCatalogDefinition,
    statusService: ConnectorStatusService,
  ) {
    super(statusService);
  }

  override listDefinitions(): ConnectorCatalogDefinition[] {
    return [this.definition];
  }

  override getDefinition(connectorId: string): ConnectorCatalogDefinition | undefined {
    return connectorId === this.definition.id ? this.definition : undefined;
  }
}

class OutputTestConnectorService extends TestConnectorService {
  constructor(
    definition: ConnectorCatalogDefinition,
    statusService: ConnectorStatusService,
    private readonly output: BoundedJsonObject = { ok: true },
  ) {
    super(definition, statusService);
  }

  protected override async executeConnectorProviderTool(_request: ConnectorExecuteRequest, _context: ConnectorExecutionContext): Promise<BoundedJsonObject> {
    return this.output;
  }
}

function readOnlyDefinition(): ConnectorCatalogDefinition {
  return externalConnector({
    tools: [{
      name: 'docs.search',
      title: 'Search docs',
      requiredScopes: ['docs:read'],
      safety: { sideEffect: 'read', approval: 'auto', reason: 'read-only docs search' },
      refreshEligible: true,
    }],
    allowedToolNames: ['docs.search'],
    minimumApproval: 'auto',
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('connector status service', () => {
  it('reports local read-only connectors as connected with account labels', () => {
    const service = new ConnectorService();

    expect(service.getConnector('project_files')).toMatchObject({
      status: 'connected',
      accountLabel: 'Local project',
    });
    expect(service.getConnector('git')).toMatchObject({
      status: 'connected',
      accountLabel: 'Current repository',
    });
  });

  it('supports available, connected, error, and disabled states', () => {
    const statusService = new ConnectorStatusService();
    const available = externalConnector();
    const disabled = externalConnector({ id: 'disabled_docs', disabled: true });

    expect(statusService.getStatus(available)).toEqual({ status: 'available' });
    expect(statusService.connect(available, 'docs@example.com')).toEqual({
      status: 'connected',
      accountLabel: 'docs@example.com',
    });
    expect(statusService.setError(available, 'OAuth token expired', 'docs@example.com')).toEqual({
      status: 'error',
      accountLabel: 'docs@example.com',
      lastError: 'OAuth token expired',
    });
    expect(statusService.disconnect(available)).toEqual({ status: 'available' });
    expect(statusService.getStatus(disabled)).toEqual({ status: 'disabled' });
  });

  it('stores OAuth credential material in the daemon global store without exposing it in connector details', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'od-connector-credentials-'));
    const credentialStore = new FileConnectorCredentialStore(dataDir);
    const statusService = new ConnectorStatusService({ credentialStore });
    const definition = externalConnector();
    const service = new TestConnectorService(definition, statusService);

    await expect(service.connect('external_docs', {
      accountLabel: 'docs@example.com',
      credentials: { access_token: 'oauth-secret-token', refresh_token: 'oauth-refresh-token' },
    })).resolves.toMatchObject({
      id: 'external_docs',
      status: 'connected',
      accountLabel: 'docs@example.com',
    });

    const serializedDetail = JSON.stringify(service.getConnector('external_docs'));
    expect(serializedDetail).not.toContain('oauth-secret-token');
    expect(serializedDetail).not.toContain('oauth-refresh-token');

    const credentialFile = await readFile(path.join(dataDir, 'connectors', 'credentials.json'), 'utf8');
    expect(credentialFile).toContain('oauth-secret-token');
    expect(credentialFile).toContain('oauth-refresh-token');

    await service.disconnect('external_docs');
    expect(service.getConnector('external_docs')).toMatchObject({ status: 'available' });
  });
});

describe('connector read-only safety classification', () => {
  it.each([
    ['scope write hint', { name: 'docs.lookup', requiredScopes: ['docs:write'] }, { sideEffect: 'write', approval: 'confirm' }],
    ['name create hint', { name: 'docs.create_page' }, { sideEffect: 'write', approval: 'confirm' }],
    ['name update hint', { name: 'docs.update_page' }, { sideEffect: 'write', approval: 'confirm' }],
    ['name delete hint', { name: 'docs.delete_page' }, { sideEffect: 'write', approval: 'confirm' }],
    ['name admin hint', { name: 'docs.admin_users' }, { sideEffect: 'write', approval: 'confirm' }],
    ['name send hint', { name: 'mail.send_digest' }, { sideEffect: 'write', approval: 'confirm' }],
    ['name post hint', { name: 'chat.post_message' }, { sideEffect: 'write', approval: 'confirm' }],
    ['name manage hint', { name: 'tasks.manage_list' }, { sideEffect: 'write', approval: 'confirm' }],
  ])('classifies %s as write with confirmation', (_label, input, expected) => {
    expect(classifyConnectorToolSafety(input)).toMatchObject(expected);
  });

  it('classifies destructive hints as disabled destructive tools', () => {
    const safety = classifyConnectorToolSafety({
      name: 'database.purge_cache',
      description: 'Destructive maintenance operation.',
    });

    expect(safety).toMatchObject({ sideEffect: 'destructive', approval: 'disabled' });
    expect(isRefreshEligibleConnectorToolSafety(safety)).toBe(false);
  });

  it('classifies explicit read-only hints as auto-approved read tools', () => {
    const safety = classifyConnectorToolSafety({
      name: 'issues.query',
      requiredScopes: ['issues:read'],
    });

    expect(safety).toMatchObject({ sideEffect: 'read', approval: 'auto' });
    expect(isRefreshEligibleConnectorToolSafety(safety)).toBe(true);
  });

  it('fails closed for unknown tools', () => {
    const safety = classifyConnectorToolSafety({ name: 'provider.sync' });

    expect(safety).toMatchObject({ sideEffect: 'write', approval: 'confirm' });
    expect(isRefreshEligibleConnectorToolSafety(safety)).toBe(false);
  });
});

describe('connector execution policy', () => {
  it('rejects connector inputs that no longer match the current tool schema', async () => {
    const service = new ConnectorService();

    await expect(service.execute(
      { connectorId: 'project_files', toolName: 'project_files.search', input: { unexpected: true } },
      { projectsRoot: '/tmp/open-design-test', projectId: 'project-a', purpose: 'agent_preview' },
    )).rejects.toMatchObject({ code: 'CONNECTOR_INPUT_SCHEMA_MISMATCH' });
  });

  it('fails closed when runtime scope classification is no longer read-only', async () => {
    const definition = externalConnector({
      tools: [{
        name: 'docs.search',
        title: 'Search docs',
        requiredScopes: ['docs:write'],
        safety: { sideEffect: 'read', approval: 'auto', reason: 'stale catalog classification' },
        refreshEligible: true,
      }],
      allowedToolNames: ['docs.search'],
      minimumApproval: 'auto',
    });
    const statusService = new ConnectorStatusService();
    statusService.connect(definition, 'docs@example.com');
    const service = new TestConnectorService(definition, statusService);

    await expect(service.execute(
      { connectorId: 'external_docs', toolName: 'docs.search', input: {}, expectedApprovalPolicy: 'auto' },
      { projectsRoot: '/tmp/open-design-test', projectId: 'project-a', purpose: 'artifact_refresh' },
    )).rejects.toMatchObject({ code: 'CONNECTOR_SAFETY_DENIED' });
  });

  it('rejects connector-backed refresh when the connected account label drifted', async () => {
    const definition = externalConnector({
      tools: [{
        name: 'docs.search',
        title: 'Search docs',
        requiredScopes: ['docs:read'],
        safety: { sideEffect: 'read', approval: 'auto', reason: 'read-only docs search' },
        refreshEligible: true,
      }],
      allowedToolNames: ['docs.search'],
      minimumApproval: 'auto',
    });
    const statusService = new ConnectorStatusService();
    statusService.connect(definition, 'new-account@example.com');
    const service = new TestConnectorService(definition, statusService);

    await expect(service.execute(
      { connectorId: 'external_docs', toolName: 'docs.search', input: {}, expectedAccountLabel: 'old-account@example.com', expectedApprovalPolicy: 'auto' },
      { projectsRoot: '/tmp/open-design-test', projectId: 'project-a', purpose: 'artifact_refresh' },
    )).rejects.toMatchObject({ code: 'CONNECTOR_NOT_CONNECTED' });
  });

  it('never allows write, destructive, or unknown tools to run as artifact refreshes', async () => {
    const definition = externalConnector({
      tools: [{
        name: 'docs.update_page',
        title: 'Update page',
        requiredScopes: ['docs:write'],
        safety: { sideEffect: 'write', approval: 'confirm', reason: 'write-capable docs update' },
        refreshEligible: false,
      }],
      allowedToolNames: ['docs.update_page'],
      minimumApproval: 'confirm',
    });
    const statusService = new ConnectorStatusService();
    statusService.connect(definition, 'docs@example.com');
    const service = new TestConnectorService(definition, statusService);

    await expect(service.execute(
      { connectorId: 'external_docs', toolName: 'docs.update_page', input: {} },
      { projectsRoot: '/tmp/open-design-test', projectId: 'project-a', purpose: 'artifact_refresh' },
    )).rejects.toBeInstanceOf(ConnectorServiceError);
    await expect(service.execute(
      { connectorId: 'external_docs', toolName: 'docs.update_page', input: {} },
      { projectsRoot: '/tmp/open-design-test', projectId: 'project-a', purpose: 'artifact_refresh' },
    )).rejects.toMatchObject({ code: 'CONNECTOR_SAFETY_DENIED' });
  });

  it('redacts credential and provider-envelope fields from connector outputs', async () => {
    const definition = readOnlyDefinition();
    const statusService = new ConnectorStatusService();
    statusService.connect(definition, 'docs@example.com');
    const service = new OutputTestConnectorService(definition, statusService, {
      toolName: 'docs.search',
      count: 1,
      rawResponse: { id: 'provider-envelope' },
      item: {
        title: 'Safe title',
        authorization: 'Bearer secret-token',
        nestedApiToken: 'secret-token',
      },
    });

    const response = await service.execute(
      { connectorId: 'external_docs', toolName: 'docs.search', input: {} },
      { projectsRoot: '/tmp/open-design-test', projectId: 'project-a', runId: 'run-redact', purpose: 'agent_preview' },
    );

    expect(response.output).toMatchObject({
      rawResponse: '[redacted]',
      item: {
        title: 'Safe title',
        authorization: '[redacted]',
        nestedApiToken: '[redacted]',
      },
    });
    expect(response.metadata).toMatchObject({ redacted: true });
    expect(JSON.stringify(response.output)).not.toContain('secret-token');
    expect(JSON.stringify(response.output)).not.toContain('provider-envelope');
  });

  it('rejects connector outputs above the serialized size limit', async () => {
    const definition = readOnlyDefinition();
    const statusService = new ConnectorStatusService();
    statusService.connect(definition, 'docs@example.com');
    const service = new OutputTestConnectorService(definition, statusService, {
      toolName: 'docs.search',
      data: 'x'.repeat(257 * 1024),
    });

    await expect(service.execute(
      { connectorId: 'external_docs', toolName: 'docs.search', input: {} },
      { projectsRoot: '/tmp/open-design-test', projectId: 'project-a', runId: 'run-large', purpose: 'agent_preview' },
    )).rejects.toMatchObject({ code: 'CONNECTOR_OUTPUT_TOO_LARGE', status: 502 });
  });

  it('enforces per-run connector rate and total call limits', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-30T00:00:00.000Z'));
    const definition = readOnlyDefinition();
    const statusService = new ConnectorStatusService();
    statusService.connect(definition, 'docs@example.com');
    const service = new OutputTestConnectorService(definition, statusService, { toolName: 'docs.search', count: 0 });
    const request = { connectorId: 'external_docs', toolName: 'docs.search', input: {} };
    const context = { projectsRoot: '/tmp/open-design-test', projectId: 'project-a', runId: 'run-limits', purpose: 'agent_preview' } as const;

    for (let index = 0; index < CONNECTOR_RUN_RATE_LIMIT_CALLS; index += 1) {
      await expect(service.execute(request, context)).resolves.toMatchObject({ ok: true });
    }
    await expect(service.execute(request, context)).rejects.toMatchObject({ code: 'CONNECTOR_RATE_LIMITED', status: 429 });

    for (let index = CONNECTOR_RUN_RATE_LIMIT_CALLS; index < CONNECTOR_RUN_TOTAL_CALL_LIMIT; index += 1) {
      vi.advanceTimersByTime(60_000);
      await expect(service.execute(request, context)).resolves.toMatchObject({ ok: true });
    }
    vi.advanceTimersByTime(60_000);
    await expect(service.execute(request, context)).rejects.toMatchObject({ code: 'CONNECTOR_RATE_LIMITED', status: 429 });
  });
});
