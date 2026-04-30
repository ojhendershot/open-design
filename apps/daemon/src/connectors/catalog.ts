import type { BoundedJsonObject, BoundedJsonValue } from '../live-artifacts/schema.js';

export type ConnectorStatus = 'available' | 'connected' | 'error' | 'disabled';
export type ConnectorToolSideEffect = 'read' | 'write' | 'destructive' | 'unknown';
export type ConnectorToolApproval = 'auto' | 'confirm' | 'disabled';

export interface ConnectorToolSafety {
  sideEffect: ConnectorToolSideEffect;
  approval: ConnectorToolApproval;
  reason: string;
}

export interface ConnectorToolDetail {
  name: string;
  title: string;
  description?: string;
  inputSchemaJson?: BoundedJsonObject;
  outputSchemaJson?: BoundedJsonObject;
  safety: ConnectorToolSafety;
  refreshEligible: boolean;
}

export interface ConnectorCatalogToolDefinition extends ConnectorToolDetail {
  /** Provider scopes required for this tool. Empty for local/read-only providers. */
  requiredScopes: string[];
}

export interface ConnectorDetail {
  id: string;
  name: string;
  provider: string;
  category: string;
  description?: string;
  status: ConnectorStatus;
  accountLabel?: string;
  tools: ConnectorToolDetail[];
  featuredToolNames?: string[];
  minimumApproval?: ConnectorToolApproval;
  lastError?: string;
}

export interface ConnectorCatalogDefinition {
  id: string;
  name: string;
  provider: string;
  category: string;
  description?: string;
  tools: ConnectorCatalogToolDefinition[];
  /** The complete allowlist of callable tool names for this connector. */
  allowedToolNames: string[];
  featuredToolNames?: string[];
  minimumApproval?: ConnectorToolApproval;
  disabled?: boolean;
}

const emptyInputSchema = {
  type: 'object',
  properties: {},
  additionalProperties: false,
} satisfies BoundedJsonObject;

const projectFilesSearchInputSchema = {
  type: 'object',
  properties: {
    query: { type: 'string', maxLength: 200 },
    glob: { type: 'string', maxLength: 200 },
    maxResults: { type: 'number', minimum: 1, maximum: 50 },
  },
  additionalProperties: false,
} satisfies BoundedJsonObject;

const projectFilesSearchOutputSchema = {
  type: 'object',
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          snippet: { type: 'string' },
        },
      },
    },
  },
} satisfies BoundedJsonObject;

const projectFilesReadJsonInputSchema = {
  type: 'object',
  properties: {
    path: { type: 'string', maxLength: 500 },
  },
  required: ['path'],
  additionalProperties: false,
} satisfies BoundedJsonObject;

const gitSummaryOutputSchema = {
  type: 'object',
  properties: {
    branch: { type: 'string' },
    commit: { type: 'string' },
    isDirty: { type: 'boolean' },
    changedFiles: { type: 'array', items: { type: 'string' } },
  },
} satisfies BoundedJsonObject;

export const CONNECTOR_CATALOG: readonly ConnectorCatalogDefinition[] = [
  {
    id: 'project_files',
    name: 'Project files',
    provider: 'open-design',
    category: 'local',
    description: 'Read compact summaries from files in the current project workspace.',
    tools: [
      {
        name: 'project_files.search',
        title: 'Search project files',
        description: 'Search project filenames and text snippets without reading hidden live-artifact implementation files.',
        inputSchemaJson: projectFilesSearchInputSchema,
        outputSchemaJson: projectFilesSearchOutputSchema,
        safety: {
          sideEffect: 'read',
          approval: 'auto',
          reason: 'Searches local project files and returns compact read-only matches.',
        },
        refreshEligible: true,
        requiredScopes: [],
      },
      {
        name: 'project_files.read_json',
        title: 'Read project JSON file',
        description: 'Read and parse a bounded JSON file from the current project workspace.',
        inputSchemaJson: projectFilesReadJsonInputSchema,
        outputSchemaJson: { value: {} },
        safety: {
          sideEffect: 'read',
          approval: 'auto',
          reason: 'Reads one bounded JSON file inside the project workspace without mutating data.',
        },
        refreshEligible: true,
        requiredScopes: [],
      },
    ],
    allowedToolNames: ['project_files.search', 'project_files.read_json'],
    featuredToolNames: ['project_files.search', 'project_files.read_json'],
    minimumApproval: 'auto',
  },
  {
    id: 'git',
    name: 'Git repository',
    provider: 'open-design',
    category: 'local',
    description: 'Read compact status and recent-change summaries from the project Git repository.',
    tools: [
      {
        name: 'git.summary',
        title: 'Git summary',
        description: 'Return current branch, commit, dirty state, and a compact changed-file summary.',
        inputSchemaJson: emptyInputSchema,
        outputSchemaJson: gitSummaryOutputSchema,
        safety: {
          sideEffect: 'read',
          approval: 'auto',
          reason: 'Runs read-only Git inspection commands and does not mutate repository state.',
        },
        refreshEligible: true,
        requiredScopes: [],
      },
    ],
    allowedToolNames: ['git.summary'],
    featuredToolNames: ['git.summary'],
    minimumApproval: 'auto',
  },
];

function cloneBoundedJsonValue(value: BoundedJsonValue): BoundedJsonValue {
  if (Array.isArray(value)) return value.map((item) => cloneBoundedJsonValue(item));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneBoundedJsonValue(entry)]));
  }
  return value;
}

function cloneBoundedJsonObject(value: BoundedJsonObject): BoundedJsonObject {
  return cloneBoundedJsonValue(value) as BoundedJsonObject;
}

function cloneToolDefinition(tool: ConnectorCatalogToolDefinition): ConnectorCatalogToolDefinition {
  return {
    name: tool.name,
    title: tool.title,
    ...(tool.description === undefined ? {} : { description: tool.description }),
    ...(tool.inputSchemaJson === undefined ? {} : { inputSchemaJson: cloneBoundedJsonObject(tool.inputSchemaJson) }),
    ...(tool.outputSchemaJson === undefined ? {} : { outputSchemaJson: cloneBoundedJsonObject(tool.outputSchemaJson) }),
    safety: { ...tool.safety },
    refreshEligible: tool.refreshEligible,
    requiredScopes: [...tool.requiredScopes],
  };
}

function cloneCatalogDefinition(definition: ConnectorCatalogDefinition): ConnectorCatalogDefinition {
  return {
    id: definition.id,
    name: definition.name,
    provider: definition.provider,
    category: definition.category,
    ...(definition.description === undefined ? {} : { description: definition.description }),
    tools: definition.tools.map((tool) => cloneToolDefinition(tool)),
    allowedToolNames: [...definition.allowedToolNames],
    ...(definition.featuredToolNames === undefined ? {} : { featuredToolNames: [...definition.featuredToolNames] }),
    ...(definition.minimumApproval === undefined ? {} : { minimumApproval: definition.minimumApproval }),
    ...(definition.disabled === undefined ? {} : { disabled: definition.disabled }),
  };
}

function toolDefinitionToDetail(tool: ConnectorCatalogToolDefinition): ConnectorToolDetail {
  return {
    name: tool.name,
    title: tool.title,
    ...(tool.description === undefined ? {} : { description: tool.description }),
    ...(tool.inputSchemaJson === undefined ? {} : { inputSchemaJson: cloneBoundedJsonObject(tool.inputSchemaJson) }),
    ...(tool.outputSchemaJson === undefined ? {} : { outputSchemaJson: cloneBoundedJsonObject(tool.outputSchemaJson) }),
    safety: { ...tool.safety },
    refreshEligible: tool.refreshEligible,
  };
}

export function listConnectorCatalogDefinitions(): ConnectorCatalogDefinition[] {
  return CONNECTOR_CATALOG.map((definition) => cloneCatalogDefinition(definition));
}

export function getConnectorCatalogDefinition(connectorId: string): ConnectorCatalogDefinition | undefined {
  const definition = CONNECTOR_CATALOG.find((connector) => connector.id === connectorId);
  if (!definition) return undefined;
  return cloneCatalogDefinition(definition);
}

export function connectorDefinitionToDetail(definition: ConnectorCatalogDefinition): ConnectorDetail {
  return {
    id: definition.id,
    name: definition.name,
    provider: definition.provider,
    category: definition.category,
    ...(definition.description === undefined ? {} : { description: definition.description }),
    status: definition.disabled ? 'disabled' : 'available',
    tools: definition.tools.map((tool) => toolDefinitionToDetail(tool)),
    ...(definition.featuredToolNames === undefined ? {} : { featuredToolNames: [...definition.featuredToolNames] }),
    ...(definition.minimumApproval === undefined ? {} : { minimumApproval: definition.minimumApproval }),
  };
}
