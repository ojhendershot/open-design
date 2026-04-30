import { describe, expect, it } from 'vitest';

import {
  ConnectorService,
  ConnectorStatusService,
} from '../src/connectors/service.js';
import {
  classifyConnectorToolSafety,
  isRefreshEligibleConnectorToolSafety,
  type ConnectorCatalogDefinition,
} from '../src/connectors/catalog.js';

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
