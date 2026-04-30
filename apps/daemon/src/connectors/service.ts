import type { BoundedJsonObject } from '../live-artifacts/schema.js';

import {
  connectorDefinitionToDetail,
  getConnectorCatalogDefinition,
  listConnectorCatalogDefinitions,
  type ConnectorDetail,
  type ConnectorCatalogDefinition,
  type ConnectorStatus,
} from './catalog.js';

export interface ConnectorExecuteRequest {
  connectorId: string;
  toolName: string;
  input: BoundedJsonObject;
}

export interface ConnectorExecuteResponse {
  connectorId: string;
  toolName: string;
  output: BoundedJsonObject;
}

export type ConnectorServiceErrorCode =
  | 'CONNECTOR_NOT_FOUND'
  | 'CONNECTOR_NOT_CONNECTED'
  | 'CONNECTOR_DISABLED'
  | 'CONNECTOR_TOOL_NOT_FOUND'
  | 'CONNECTOR_SAFETY_DENIED'
  | 'CONNECTOR_EXECUTION_FAILED';

export class ConnectorServiceError extends Error {
  constructor(
    readonly code: ConnectorServiceErrorCode,
    message: string,
    readonly status: number,
    readonly details?: BoundedJsonObject,
  ) {
    super(message);
    this.name = 'ConnectorServiceError';
  }
}

export interface ConnectorConnectionStatus {
  status: ConnectorStatus;
  accountLabel?: string;
  lastError?: string;
}

export interface ConnectorConnectionRecord extends ConnectorConnectionStatus {
  updatedAt: string;
}

export interface ConnectorStatusServiceOptions {
  initialStatuses?: Record<string, ConnectorConnectionStatus>;
}

const LOCAL_CONNECTOR_ACCOUNT_LABELS: Record<string, string> = {
  project_files: 'Local project',
  git: 'Current repository',
};

function nowIso(): string {
  return new Date().toISOString();
}

function cloneStatus(status: ConnectorConnectionStatus): ConnectorConnectionStatus {
  return {
    status: status.status,
    ...(status.accountLabel === undefined ? {} : { accountLabel: status.accountLabel }),
    ...(status.lastError === undefined ? {} : { lastError: status.lastError }),
  };
}

function isLocalAutoConnected(definition: ConnectorCatalogDefinition): boolean {
  return definition.provider === 'open-design' && definition.tools.every((tool) => tool.requiredScopes.length === 0);
}

function defaultConnectedAccountLabel(definition: ConnectorCatalogDefinition): string {
  return LOCAL_CONNECTOR_ACCOUNT_LABELS[definition.id] ?? definition.name;
}

export class ConnectorStatusService {
  private readonly statuses = new Map<string, ConnectorConnectionRecord>();

  constructor(options: ConnectorStatusServiceOptions = {}) {
    for (const [connectorId, status] of Object.entries(options.initialStatuses ?? {})) {
      this.statuses.set(connectorId, { ...cloneStatus(status), updatedAt: nowIso() });
    }
  }

  getStatus(definition: ConnectorCatalogDefinition): ConnectorConnectionStatus {
    if (definition.disabled) return { status: 'disabled' };

    const stored = this.statuses.get(definition.id);
    if (stored) return cloneStatus(stored);

    if (isLocalAutoConnected(definition)) {
      return { status: 'connected', accountLabel: defaultConnectedAccountLabel(definition) };
    }

    return { status: 'available' };
  }

  connect(definition: ConnectorCatalogDefinition, accountLabel?: string): ConnectorConnectionStatus {
    if (definition.disabled) return { status: 'disabled' };

    const next: ConnectorConnectionRecord = {
      status: 'connected',
      accountLabel: accountLabel ?? defaultConnectedAccountLabel(definition),
      updatedAt: nowIso(),
    };
    this.statuses.set(definition.id, next);
    return cloneStatus(next);
  }

  disconnect(definition: ConnectorCatalogDefinition): ConnectorConnectionStatus {
    if (definition.disabled) return { status: 'disabled' };

    if (isLocalAutoConnected(definition)) {
      this.statuses.delete(definition.id);
      return this.getStatus(definition);
    }

    const next: ConnectorConnectionRecord = { status: 'available', updatedAt: nowIso() };
    this.statuses.set(definition.id, next);
    return cloneStatus(next);
  }

  setError(definition: ConnectorCatalogDefinition, lastError: string, accountLabel?: string): ConnectorConnectionStatus {
    if (definition.disabled) return { status: 'disabled' };

    const next: ConnectorConnectionRecord = {
      status: 'error',
      ...(accountLabel === undefined ? {} : { accountLabel }),
      lastError,
      updatedAt: nowIso(),
    };
    this.statuses.set(definition.id, next);
    return cloneStatus(next);
  }

  clear(connectorId: string): void {
    this.statuses.delete(connectorId);
  }
}

export interface ConnectorExecutionContext {
  projectId: string;
  runId?: string;
  purpose?: 'agent_preview' | 'artifact_refresh';
}

export class ConnectorService {
  constructor(private readonly statusService = new ConnectorStatusService()) {}

  listDefinitions(): ConnectorCatalogDefinition[] {
    return listConnectorCatalogDefinitions();
  }

  getDefinition(connectorId: string): ConnectorCatalogDefinition | undefined {
    return getConnectorCatalogDefinition(connectorId);
  }

  getStatus(definition: ConnectorCatalogDefinition): ConnectorConnectionStatus {
    return this.statusService.getStatus(definition);
  }

  listConnectors(): ConnectorDetail[] {
    return this.listDefinitions().map((definition) => this.toDetail(definition));
  }

  getConnector(connectorId: string): ConnectorDetail {
    const definition = this.getDefinition(connectorId);
    if (!definition) {
      throw new ConnectorServiceError('CONNECTOR_NOT_FOUND', 'connector not found', 404);
    }
    return this.toDetail(definition);
  }

  async connect(connectorId: string): Promise<ConnectorDetail> {
    const definition = this.getDefinition(connectorId);
    if (!definition) {
      throw new ConnectorServiceError('CONNECTOR_NOT_FOUND', 'connector not found', 404);
    }
    const status = this.statusService.connect(definition);
    if (status.status === 'disabled') {
      throw new ConnectorServiceError('CONNECTOR_DISABLED', 'connector is disabled', 403);
    }
    return this.toDetail(definition);
  }

  async disconnect(connectorId: string): Promise<ConnectorDetail> {
    const definition = this.getDefinition(connectorId);
    if (!definition) {
      throw new ConnectorServiceError('CONNECTOR_NOT_FOUND', 'connector not found', 404);
    }
    this.statusService.disconnect(definition);
    return this.toDetail(definition);
  }

  async execute(request: ConnectorExecuteRequest, _context: ConnectorExecutionContext): Promise<ConnectorExecuteResponse> {
    const connector = this.getConnector(request.connectorId);
    const tool = connector.tools.find((candidate) => candidate.name === request.toolName);
    if (!tool) {
      throw new ConnectorServiceError('CONNECTOR_TOOL_NOT_FOUND', 'connector tool not found', 404);
    }
    throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'connector execution is not implemented', 501);
  }

  private toDetail(definition: ConnectorCatalogDefinition): ConnectorDetail {
    const detail = connectorDefinitionToDetail(definition);
    const status = this.getStatus(definition);
    return {
      ...detail,
      status: status.status,
      ...(status.accountLabel === undefined ? {} : { accountLabel: status.accountLabel }),
      ...(status.lastError === undefined ? {} : { lastError: status.lastError }),
    };
  }
}

export const connectorService = new ConnectorService();
