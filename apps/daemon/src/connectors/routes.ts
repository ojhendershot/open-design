import type { Express, Request, Response } from 'express';

import type { ToolTokenGrant } from '../tool-tokens.js';
import { validateBoundedJsonObject } from '../live-artifacts/schema.js';
import { executeConnectorTool, listConnectorTools } from '../tools/connectors.js';
import { connectorService, ConnectorService, ConnectorServiceError } from './service.js';

type ConnectorApiErrorCode =
  | 'BAD_REQUEST'
  | 'FORBIDDEN'
  | 'VALIDATION_FAILED'
  | 'CONNECTOR_NOT_FOUND'
  | 'CONNECTOR_NOT_CONNECTED'
  | 'CONNECTOR_DISABLED'
  | 'CONNECTOR_TOOL_NOT_FOUND'
  | 'CONNECTOR_SAFETY_DENIED'
  | 'CONNECTOR_INPUT_SCHEMA_MISMATCH'
  | 'CONNECTOR_RATE_LIMITED'
  | 'CONNECTOR_OUTPUT_TOO_LARGE'
  | 'CONNECTOR_EXECUTION_FAILED';

export type ConnectorApiErrorSender = (
  res: Response,
  status: number,
  code: ConnectorApiErrorCode,
  message: string,
  init?: { details?: unknown; retryable?: boolean; requestId?: string; taskId?: string },
) => Response;

export interface RegisterConnectorRoutesOptions {
  service?: ConnectorService;
  sendApiError: ConnectorApiErrorSender;
  projectsRoot?: string;
  authorizeToolRequest?: (req: Request, res: Response, operation: string) => ToolTokenGrant | null;
}

function sendConnectorRouteError(res: Response, err: unknown, sendApiError: ConnectorApiErrorSender): Response {
  if (err instanceof ConnectorServiceError) {
    return sendApiError(res, err.status, err.code, err.message, err.details === undefined ? {} : { details: err.details });
  }
  return sendApiError(res, 500, 'CONNECTOR_EXECUTION_FAILED', err instanceof Error ? err.message : String(err));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function connectorCallbackUrl(req: Request): string {
  const host = req.get('host') ?? 'localhost';
  let hostname = 'localhost';
  try {
    hostname = new URL(`http://${host}`).hostname;
  } catch {
    throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'connector OAuth callback host is invalid', 400, { host });
  }
  const allowed = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (!allowed) {
    throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'connector OAuth callback host must be loopback', 400, { host });
  }
  return `${req.protocol}://${host}/api/connectors/oauth/callback`;
}

export function registerConnectorRoutes(app: Express, options: RegisterConnectorRoutesOptions): void {
  const service = options.service ?? connectorService;

  app.get('/api/connectors', (_req: Request, res: Response) => {
    try {
      res.json({ connectors: service.listConnectors() });
    } catch (err) {
      sendConnectorRouteError(res, err, options.sendApiError);
    }
  });

  app.get('/api/connectors/:connectorId', (req: Request, res: Response) => {
    try {
      const connectorId = req.params.connectorId;
      if (!connectorId) return options.sendApiError(res, 400, 'CONNECTOR_NOT_FOUND', 'connectorId is required');
      res.json({ connector: service.getConnector(connectorId) });
    } catch (err) {
      sendConnectorRouteError(res, err, options.sendApiError);
    }
  });

  app.post('/api/connectors/:connectorId/connect', async (req: Request, res: Response) => {
    try {
      const connectorId = req.params.connectorId;
      if (!connectorId) return options.sendApiError(res, 400, 'CONNECTOR_NOT_FOUND', 'connectorId is required');
      const body = isPlainObject(req.body) ? req.body : {};
      const accountLabel = typeof body.accountLabel === 'string' ? body.accountLabel : undefined;
      const credentials = body.credentials === undefined ? undefined : body.credentials;
      if (credentials !== undefined && !isPlainObject(credentials)) {
        options.sendApiError(res, 400, 'VALIDATION_FAILED', 'credentials must be an object');
        return;
      }
      const definition = service.getDefinition(connectorId);
      if (definition?.authentication === 'composio' && credentials !== undefined) {
        options.sendApiError(res, 400, 'VALIDATION_FAILED', 'Composio connector credentials can only be stored through OAuth callback completion');
        return;
      }
      res.json({
        ...(await service.connect(connectorId, {
          ...(accountLabel === undefined ? {} : { accountLabel }),
          ...(credentials === undefined ? {} : { credentials }),
          callbackUrl: `${connectorCallbackUrl(req)}/${encodeURIComponent(connectorId)}`,
        })),
      });
    } catch (err) {
      sendConnectorRouteError(res, err, options.sendApiError);
    }
  });

  app.get('/api/connectors/oauth/callback/:connectorId', async (req: Request, res: Response) => {
    try {
      const connectorId = req.params.connectorId;
      if (!connectorId) return options.sendApiError(res, 400, 'CONNECTOR_NOT_FOUND', 'connectorId is required');
      const state = typeof req.query.state === 'string' ? req.query.state : undefined;
      if (!state) return options.sendApiError(res, 400, 'BAD_REQUEST', 'state is required');
      const providerConnectionId = typeof req.query.connected_account_id === 'string'
        ? req.query.connected_account_id
        : typeof req.query.connection_id === 'string'
          ? req.query.connection_id
          : typeof req.query.account_id === 'string'
            ? req.query.account_id
            : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      await service.completeComposioConnection({ connectorId, state, ...(providerConnectionId === undefined ? {} : { providerConnectionId }), ...(status === undefined ? {} : { status }) });
      res.type('html').send(`<!doctype html><title>Connector connected</title><p>Connector connected. You can close this window.</p><script>try{window.opener&&window.opener.postMessage({type:'open-design:connector-connected',connectorId:${JSON.stringify(connectorId)}},'*');window.close();}catch{}</script>`);
    } catch (err) {
      sendConnectorRouteError(res, err, options.sendApiError);
    }
  });

  app.delete('/api/connectors/:connectorId/connection', async (req: Request, res: Response) => {
    try {
      const connectorId = req.params.connectorId;
      if (!connectorId) return options.sendApiError(res, 400, 'CONNECTOR_NOT_FOUND', 'connectorId is required');
      res.json({ connector: await service.disconnect(connectorId) });
    } catch (err) {
      sendConnectorRouteError(res, err, options.sendApiError);
    }
  });

  app.get('/api/tools/connectors/list', (req: Request, res: Response) => {
    try {
      if (!options.authorizeToolRequest) {
        options.sendApiError(res, 500, 'CONNECTOR_EXECUTION_FAILED', 'connector tool routes are not configured');
        return;
      }
      const grant = options.authorizeToolRequest?.(req, res, 'connectors:list');
      if (!grant) return;
      const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
      if (projectId && projectId !== grant.projectId) {
        options.sendApiError(res, 403, 'FORBIDDEN', 'projectId is derived from the tool token', {
          details: { suppliedProjectId: projectId },
        });
        return;
      }
      if (!options.projectsRoot) {
        options.sendApiError(res, 500, 'CONNECTOR_EXECUTION_FAILED', 'connector tool routes are not configured');
        return;
      }
      res.json({ connectors: listConnectorTools({ grant, projectsRoot: options.projectsRoot, service }) });
    } catch (err) {
      sendConnectorRouteError(res, err, options.sendApiError);
    }
  });

  app.post('/api/tools/connectors/execute', async (req: Request, res: Response) => {
    try {
      if (!options.authorizeToolRequest) {
        options.sendApiError(res, 500, 'CONNECTOR_EXECUTION_FAILED', 'connector tool routes are not configured');
        return;
      }
      const grant = options.authorizeToolRequest?.(req, res, 'connectors:execute');
      if (!grant) return;
      if (!options.projectsRoot) {
        options.sendApiError(res, 500, 'CONNECTOR_EXECUTION_FAILED', 'connector tool routes are not configured');
        return;
      }

      const { projectId, connectorId, toolName, input, purpose } = req.body || {};
      if (projectId && projectId !== grant.projectId) {
        options.sendApiError(res, 403, 'FORBIDDEN', 'projectId is derived from the tool token', {
          details: { suppliedProjectId: projectId },
        });
        return;
      }
      if (purpose !== undefined && purpose !== 'agent_preview') {
        options.sendApiError(res, 403, 'FORBIDDEN', 'connector tool purpose is derived from the tool token', {
          details: { suppliedPurpose: purpose },
        });
        return;
      }
      if (typeof connectorId !== 'string' || connectorId.length === 0) {
        options.sendApiError(res, 400, 'BAD_REQUEST', 'connectorId is required');
        return;
      }
      if (typeof toolName !== 'string' || toolName.length === 0) {
        options.sendApiError(res, 400, 'BAD_REQUEST', 'toolName is required');
        return;
      }
      const inputValidation = validateBoundedJsonObject(input ?? {}, 'input');
      if (!inputValidation.ok) {
        options.sendApiError(res, 400, 'VALIDATION_FAILED', inputValidation.error, {
          details: { kind: 'validation', issues: inputValidation.issues },
        });
        return;
      }

      const result = await executeConnectorTool(
        { connectorId, toolName, input: inputValidation.value },
        { grant, projectsRoot: options.projectsRoot, service },
      );
      res.json(result);
    } catch (err) {
      sendConnectorRouteError(res, err, options.sendApiError);
    }
  });
}
