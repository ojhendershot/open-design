import { describe, expect, it } from 'vitest';

import {
  ConnectorService,
  ConnectorStatusService,
} from '../src/connectors/service.js';
import type { ConnectorCatalogDefinition } from '../src/connectors/catalog.js';

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
