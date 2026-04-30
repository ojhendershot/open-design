import crypto from 'node:crypto';

import type { BoundedJsonObject, BoundedJsonValue } from '../live-artifacts/schema.js';
import type { ConnectorCatalogDefinition, ConnectorCatalogToolDefinition } from './catalog.js';
import { ConnectorServiceError, type ConnectorCredentialMaterial } from './service.js';

const DEFAULT_COMPOSIO_BASE_URL = 'https://backend.composio.dev';
const DEFAULT_COMPOSIO_TIMEOUT_MS = 30_000;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

interface ComposioConnectedAccountResponse {
  id?: unknown;
  nanoid?: unknown;
  connected_account_id?: unknown;
  connectedAccountId?: unknown;
  status?: unknown;
  redirect_url?: unknown;
  redirectUrl?: unknown;
  user_id?: unknown;
  userId?: unknown;
  account_id?: unknown;
  accountId?: unknown;
  account_label?: unknown;
  accountLabel?: unknown;
  name?: unknown;
  email?: unknown;
  auth_config?: { id?: unknown };
  toolkit?: { slug?: unknown };
  metadata?: unknown;
}

interface ComposioAuthConfigResponse {
  id?: unknown;
  status?: unknown;
  toolkit?: { slug?: unknown };
  toolkit_slug?: unknown;
  toolkitSlug?: unknown;
}

interface ComposioToolExecuteResponse {
  data?: unknown;
  error?: unknown;
  successful?: unknown;
  session_info?: unknown;
  sessionInfo?: unknown;
  log_id?: unknown;
  logId?: unknown;
}

export interface ComposioConnectionStart {
  kind: 'redirect_required' | 'pending' | 'connected';
  redirectUrl?: string;
  providerConnectionId?: string;
  expiresAt?: string;
  accountLabel?: string;
  credentials?: ConnectorCredentialMaterial;
}

export interface ComposioPendingConnection {
  connectorId: string;
  state: string;
  providerConnectionId?: string;
  expiresAtMs: number;
}

export interface ComposioConnectionCompletion {
  connectorId: string;
  accountLabel: string;
  credentials: ConnectorCredentialMaterial;
}

export class ComposioConnectorProvider {
  private discoveredAuthConfigIds: Record<string, string> | undefined;
  private readonly pendingConnections = new Map<string, ComposioPendingConnection>();

  isConfigured(definition: ConnectorCatalogDefinition): boolean {
    return Boolean(this.getApiKey() && (this.getConfiguredAuthConfigId(definition) || this.discoveredAuthConfigIds?.[definition.id]));
  }

  async connect(definition: ConnectorCatalogDefinition, callbackUrl: string, signal?: AbortSignal): Promise<ComposioConnectionStart> {
    const authConfigId = await this.getAuthConfigId(definition, signal);
    if (!authConfigId) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio auth config is not configured for this connector', 503, {
        connectorId: definition.id,
        env: composioAuthConfigEnvName(definition.id),
      });
    }

    const state = crypto.randomBytes(24).toString('base64url');
    const expiresAtMs = Date.now() + OAUTH_STATE_TTL_MS;
    const expiresAt = new Date(expiresAtMs).toISOString();
    const response = await this.requestJson<ComposioConnectedAccountResponse>('/api/v3.1/connected_accounts/link', {
      method: 'POST',
      body: JSON.stringify({
        auth_config_id: authConfigId,
        user_id: this.getUserId(),
        connection_data: { state_prefix: state },
        callback_url: appendOAuthStateToCallbackUrl(callbackUrl, state),
      }),
      ...(signal === undefined ? {} : { signal }),
    });

    const providerConnectionId = getComposioConnectionId(response);
    const redirectUrl = getString(response.redirect_url) ?? getString(response.redirectUrl);
    const status = getString(response.status)?.toUpperCase();
    this.pendingConnections.set(state, { connectorId: definition.id, state, ...(providerConnectionId ? { providerConnectionId } : {}), expiresAtMs });

    return {
      kind: redirectUrl ? 'redirect_required' : status === 'ACTIVE' ? 'connected' : 'pending',
      ...(redirectUrl ? { redirectUrl } : {}),
      ...(providerConnectionId ? { providerConnectionId } : {}),
      expiresAt,
      ...(status === 'ACTIVE' && providerConnectionId ? this.connectionToCredentials(definition, providerConnectionId, response) : {}),
    };
  }

  async completeConnection(input: { definition: ConnectorCatalogDefinition; state: string; providerConnectionId?: string; status?: string; signal?: AbortSignal }): Promise<ComposioConnectionCompletion> {
    const connectorId = input.definition.id;
    const pending = this.pendingConnections.get(input.state);
    this.pendingConnections.delete(input.state);
    if (!pending || pending.connectorId !== connectorId || pending.expiresAtMs < Date.now()) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio OAuth state is missing or expired', 400, { connectorId });
    }
    if (input.status && input.status.toLowerCase() !== 'success') {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio OAuth did not complete successfully', 400, { connectorId });
    }
    const providerConnectionId = input.providerConnectionId ?? pending.providerConnectionId;
    if (input.providerConnectionId && pending.providerConnectionId && input.providerConnectionId !== pending.providerConnectionId) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio callback connection id did not match pending connection', 403, { connectorId });
    }
    if (!providerConnectionId) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio callback did not include a connection id', 400, { connectorId });
    }
    const response = await this.requestJson<ComposioConnectedAccountResponse>(`/api/v3/connected_accounts/${encodeURIComponent(providerConnectionId)}`, {
      method: 'GET',
      ...(input.signal === undefined ? {} : { signal: input.signal }),
    });
    const providerUserId = getString(response.user_id) ?? getString(response.userId);
    if (providerUserId && providerUserId !== this.getUserId()) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio account belongs to a different user', 403, { connectorId });
    }
    const expectedAuthConfigId = await this.getAuthConfigId(input.definition, input.signal);
    const providerAuthConfigId = getString(response.auth_config?.id);
    if (expectedAuthConfigId && providerAuthConfigId && expectedAuthConfigId !== providerAuthConfigId) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio account belongs to a different auth configuration', 403, { connectorId });
    }
    const expectedToolkitSlug = input.definition.providerConnectorId;
    const providerToolkitSlug = getString(response.toolkit?.slug);
    if (expectedToolkitSlug && providerToolkitSlug && connectorIdForToolkitSlug(expectedToolkitSlug) !== connectorIdForToolkitSlug(providerToolkitSlug)) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio account belongs to a different toolkit', 403, { connectorId });
    }
    return this.connectionToCredentials(input.definition, providerConnectionId, response);
  }

  async disconnect(credentials: ConnectorCredentialMaterial | undefined, signal?: AbortSignal): Promise<void> {
    const providerConnectionId = credentials ? getString(credentials.providerConnectionId) : undefined;
    if (!providerConnectionId || !this.getApiKey()) return;
    const response = await this.request(`/api/v3/connected_accounts/${encodeURIComponent(providerConnectionId)}`, { method: 'DELETE', ...(signal === undefined ? {} : { signal }) });
    if (!response.ok && response.status !== 404) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', `Composio disconnect failed with HTTP ${response.status}`, 502, { httpStatus: response.status });
    }
  }

  async execute(definition: ConnectorCatalogDefinition, tool: ConnectorCatalogToolDefinition, input: BoundedJsonObject, credentials: ConnectorCredentialMaterial | undefined, signal?: AbortSignal): Promise<BoundedJsonObject> {
    const providerConnectionId = credentials ? getString(credentials.providerConnectionId) : undefined;
    if (!providerConnectionId) {
      throw new ConnectorServiceError('CONNECTOR_NOT_CONNECTED', 'Composio connector is not connected', 403, { connectorId: definition.id });
    }
    const providerToolId = tool.providerToolId ?? tool.name;
    const response = await this.requestJson<ComposioToolExecuteResponse>(`/api/v3.1/tools/execute/${encodeURIComponent(providerToolId)}`, {
      method: 'POST',
      body: JSON.stringify({
        connected_account_id: providerConnectionId,
        user_id: this.getUserId(),
        arguments: input,
      }),
      ...(signal === undefined ? {} : { signal }),
    });
    if (response.successful === false || response.error) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio tool execution failed', 502, {
        connectorId: definition.id,
        toolName: tool.name,
        error: toBoundedJsonValue(response.error),
      });
    }
    const output = toBoundedJsonValue(response.data);
    return {
      toolName: tool.name,
      providerToolId,
      data: output,
      ...(getString(response.log_id) ?? getString(response.logId) ? { providerExecutionId: (getString(response.log_id) ?? getString(response.logId))! } : {}),
      ...(toBoundedJsonValue(response.session_info ?? response.sessionInfo) !== null ? { sessionInfo: toBoundedJsonValue(response.session_info ?? response.sessionInfo) } : {}),
    };
  }

  private async getAuthConfigId(definition: ConnectorCatalogDefinition, signal?: AbortSignal): Promise<string | undefined> {
    const configured = this.getConfiguredAuthConfigId(definition);
    if (configured) return configured;
    if (!this.discoveredAuthConfigIds) this.discoveredAuthConfigIds = await this.discoverAuthConfigIds(signal);
    return this.discoveredAuthConfigIds[definition.id];
  }

  private getConfiguredAuthConfigId(definition: ConnectorCatalogDefinition): string | undefined {
    return getNonEmptyEnv(composioAuthConfigEnvName(definition.id));
  }

  private async discoverAuthConfigIds(signal?: AbortSignal): Promise<Record<string, string>> {
    if (!this.getApiKey()) return {};
    const response = await this.request('/api/v3/auth_configs', { method: 'GET', ...(signal === undefined ? {} : { signal }) });
    if (!response.ok) return {};
    const payload = await response.json() as { items?: unknown; data?: unknown };
    const items = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.data) ? payload.data : [];
    const discovered: Record<string, string> = {};
    for (const item of items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const raw = item as ComposioAuthConfigResponse;
      const authConfigId = getString(raw.id);
      const toolkitSlug = getString(raw.toolkit?.slug) ?? getString(raw.toolkit_slug) ?? getString(raw.toolkitSlug);
      const status = getString(raw.status)?.toUpperCase();
      if (!authConfigId || !toolkitSlug || (status && status !== 'ENABLED')) continue;
      discovered[connectorIdForToolkitSlug(toolkitSlug)] = authConfigId;
    }
    return discovered;
  }

  private connectionToCredentials(_definition: ConnectorCatalogDefinition, providerConnectionId: string, response: ComposioConnectedAccountResponse): ComposioConnectionCompletion {
    const accountLabel = getString(response.account_label)
      ?? getString(response.accountLabel)
      ?? getString(response.email)
      ?? getString(response.name)
      ?? providerConnectionId;
    const accountId = getString(response.account_id) ?? getString(response.accountId);
    return {
      connectorId: _definition.id,
      accountLabel,
      credentials: {
        provider: 'composio',
        providerConnectionId,
        ...(accountId ? { accountId } : {}),
      },
    };
  }

  private async requestJson<T extends object>(path: string, input: { method: string; body?: string; signal?: AbortSignal }): Promise<T> {
    const response = await this.request(path, input);
    if (!response.ok) {
      const message = await getComposioErrorMessage(response);
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', message ?? `Composio request failed with HTTP ${response.status}`, response.status === 401 ? 401 : 502, { httpStatus: response.status });
    }
    const value = await response.json() as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio returned an invalid response', 502);
    }
    return value as T;
  }

  private async request(path: string, input: { method: string; body?: string; signal?: AbortSignal }): Promise<Response> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio provider is not configured', 503, { env: 'COMPOSIO_API_KEY' });
    }
    const timeout = AbortSignal.timeout(Number(getNonEmptyEnv('COMPOSIO_TIMEOUT_MS')) || DEFAULT_COMPOSIO_TIMEOUT_MS);
    const signal = input.signal ? AbortSignal.any([input.signal, timeout]) : timeout;
    return fetch(`${this.getBaseUrl().replace(/\/+$/, '')}${path}`, {
      method: input.method,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'user-agent': 'OpenDesign/0.1 ComposioConnectorProvider',
        'x-api-key': apiKey,
      },
      ...(input.body ? { body: input.body } : {}),
      signal,
    });
  }

  private getApiKey(): string | undefined {
    return getNonEmptyEnv('COMPOSIO_API_KEY');
  }

  private getBaseUrl(): string {
    return getNonEmptyEnv('COMPOSIO_BASE_URL') ?? DEFAULT_COMPOSIO_BASE_URL;
  }

  private getUserId(): string {
    return getNonEmptyEnv('COMPOSIO_USER_ID') ?? 'open-design-local-user';
  }
}

export const composioConnectorProvider = new ComposioConnectorProvider();

function composioAuthConfigEnvName(connectorId: string): string {
  return `COMPOSIO_AUTH_CONFIG_${connectorId.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
}

function getNonEmptyEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function getComposioConnectionId(response: ComposioConnectedAccountResponse): string | undefined {
  return getString(response.connected_account_id) ?? getString(response.connectedAccountId) ?? getString(response.id) ?? getString(response.nanoid);
}

function appendOAuthStateToCallbackUrl(callbackUrl: string, state: string): string {
  const url = new URL(callbackUrl);
  url.searchParams.set('state', state);
  return url.toString();
}

function connectorIdForToolkitSlug(toolkitSlug: string): string {
  const normalized = toolkitSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized === 'googledrive' || normalized === 'gdrive' || normalized === 'drive') return 'google_drive';
  return normalized;
}

async function getComposioErrorMessage(response: Response): Promise<string | undefined> {
  try {
    const payload = await response.json() as unknown;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
    const record = payload as Record<string, unknown>;
    return getString(record.message) ?? getString(record.error) ?? getString(record.detail);
  } catch {
    return undefined;
  }
}

function toBoundedJsonValue(value: unknown): BoundedJsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((item) => toBoundedJsonValue(item));
  if (value && typeof value === 'object') {
    const output: BoundedJsonObject = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) output[key] = toBoundedJsonValue(child);
    return output;
  }
  return null;
}
