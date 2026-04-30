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
  /** Provider-native tool identifier, when different from the Open Design tool name. */
  providerToolId?: string;
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
  auth?: ConnectorAuthDetail;
}

export interface ConnectorAuthDetail {
  provider: 'local' | 'none' | 'oauth' | 'composio';
  configured: boolean;
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
  /** How the connector is made available. `none` and `local` connectors require no user OAuth state. */
  authentication?: 'local' | 'none' | 'oauth' | 'composio';
  /** Provider toolkit slug used by external connector providers such as Composio. */
  providerConnectorId?: string;
  featuredToolNames?: string[];
  minimumApproval?: ConnectorToolApproval;
  disabled?: boolean;
}

export interface ConnectorToolSafetyClassificationInput {
  name: string;
  title?: string;
  description?: string;
  requiredScopes?: readonly string[];
}

const destructiveHintPattern = /(?:^|[._:\-/\s])(?:destructive|destroy|drop|truncate|purge|erase|wipe|remove-all|remove_all|revoke|reset)(?:$|[._:\-/\s])/i;
const writeHintPattern = /(?:^|[._:\-/\s])(?:write|create|update|delete|admin|send|post|manage)(?:$|[._:\-/\s])/i;
const readOnlyHintPattern = /(?:^|[._:\-/\s])(?:read|readonly|read-only|read_only|get|list|search|fetch|view|query|inspect|summary|status)(?:$|[._:\-/\s])/i;

function connectorToolSafetyHaystack(input: ConnectorToolSafetyClassificationInput): string {
  return [input.name, input.title, input.description, ...(input.requiredScopes ?? [])]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ');
}

export function classifyConnectorToolSafety(input: ConnectorToolSafetyClassificationInput): ConnectorToolSafety {
  const haystack = connectorToolSafetyHaystack(input);
  if (destructiveHintPattern.test(haystack)) {
    return {
      sideEffect: 'destructive',
      approval: 'disabled',
      reason: 'Tool name, scope, or description contains destructive hints; destructive tools are not refreshable.',
    };
  }
  if (writeHintPattern.test(haystack)) {
    return {
      sideEffect: 'write',
      approval: 'confirm',
      reason: 'Tool name or required scope indicates write-capable behavior; explicit confirmation is required.',
    };
  }
  if (readOnlyHintPattern.test(haystack)) {
    return {
      sideEffect: 'read',
      approval: 'auto',
      reason: 'Tool name, scope, or description indicates explicit read-only behavior.',
    };
  }
  return {
    sideEffect: 'write',
    approval: 'confirm',
    reason: 'Tool safety could not be proven read-only; defaulting to confirmation-required write policy.',
  };
}

export function isRefreshEligibleConnectorToolSafety(safety: ConnectorToolSafety): boolean {
  return safety.sideEffect === 'read' && safety.approval === 'auto';
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

const githubPublicRepoSummaryInputSchema = {
  type: 'object',
  properties: {
    owner: { type: 'string', maxLength: 100 },
    repo: { type: 'string', maxLength: 100 },
  },
  required: ['owner', 'repo'],
  additionalProperties: false,
} satisfies BoundedJsonObject;

const githubPublicRepoSummaryOutputSchema = {
  type: 'object',
  properties: {
    toolName: { type: 'string' },
    fullName: { type: 'string' },
    description: { type: 'string' },
    stars: { type: 'number' },
    forks: { type: 'number' },
    openIssues: { type: 'number' },
    defaultBranch: { type: 'string' },
    url: { type: 'string' },
    updatedAt: { type: 'string' },
  },
} satisfies BoundedJsonObject;

const composioGenericInputSchema = {
  type: 'object',
  additionalProperties: true,
} satisfies BoundedJsonObject;

const composioGenericOutputSchema = {
  type: 'object',
  additionalProperties: true,
} satisfies BoundedJsonObject;

function defineConnectorTool(
  tool: Omit<ConnectorCatalogToolDefinition, 'safety' | 'refreshEligible'> & {
    safety?: ConnectorToolSafety;
    refreshEligible?: boolean;
  },
): ConnectorCatalogToolDefinition {
  const safety = tool.safety ?? classifyConnectorToolSafety(tool);
  return {
    ...tool,
    safety,
    refreshEligible: tool.refreshEligible ?? (tool.providerToolId === undefined && isRefreshEligibleConnectorToolSafety(safety)),
  };
}

export const CONNECTOR_CATALOG: readonly ConnectorCatalogDefinition[] = [
  {
    id: 'project_files',
    name: 'Project files',
    provider: 'open-design',
    category: 'local',
    description: 'Read compact summaries from files in the current project workspace.',
    tools: [
      defineConnectorTool({
        name: 'project_files.search',
        title: 'Search project files',
        description: 'Search project filenames and text snippets without reading hidden live-artifact implementation files.',
        inputSchemaJson: projectFilesSearchInputSchema,
        outputSchemaJson: projectFilesSearchOutputSchema,
        requiredScopes: [],
      }),
      defineConnectorTool({
        name: 'project_files.read_json',
        title: 'Read project JSON file',
        description: 'Read and parse a bounded JSON file from the current project workspace.',
        inputSchemaJson: projectFilesReadJsonInputSchema,
        outputSchemaJson: { value: {} },
        requiredScopes: [],
      }),
    ],
    allowedToolNames: ['project_files.search', 'project_files.read_json'],
    authentication: 'local',
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
      defineConnectorTool({
        name: 'git.summary',
        title: 'Git summary',
        description: 'Return current branch, commit, dirty state, and a compact changed-file summary.',
        inputSchemaJson: emptyInputSchema,
        outputSchemaJson: gitSummaryOutputSchema,
        requiredScopes: [],
      }),
    ],
    allowedToolNames: ['git.summary'],
    authentication: 'local',
    featuredToolNames: ['git.summary'],
    minimumApproval: 'auto',
  },
  {
    id: 'github_public',
    name: 'GitHub public repository',
    provider: 'github',
    category: 'public',
    description: 'Read compact summaries for public GitHub repositories without OAuth credentials.',
    tools: [
      defineConnectorTool({
        name: 'github.public_repo_summary',
        title: 'Public repository summary',
        description: 'Fetch a compact read-only summary for a public GitHub repository via the unauthenticated API.',
        inputSchemaJson: githubPublicRepoSummaryInputSchema,
        outputSchemaJson: githubPublicRepoSummaryOutputSchema,
        requiredScopes: [],
      }),
    ],
    allowedToolNames: ['github.public_repo_summary'],
    authentication: 'none',
    featuredToolNames: ['github.public_repo_summary'],
    minimumApproval: 'auto',
  },
  {
    id: 'github',
    name: 'GitHub',
    provider: 'composio',
    providerConnectorId: 'GITHUB',
    category: 'developer',
    description: 'Search repositories, issues, pull requests, commits, and releases from a connected GitHub account via Composio.',
    tools: [
      defineConnectorTool({
        name: 'github.search_issues_and_pull_requests',
        providerToolId: 'GITHUB_SEARCH_ISSUES_AND_PULL_REQUESTS',
        title: 'Search issues and pull requests',
        description: 'Search issues and pull requests across repositories visible to the connected account.',
        inputSchemaJson: composioGenericInputSchema,
        outputSchemaJson: composioGenericOutputSchema,
        requiredScopes: ['readOnlyHint'],
      }),
      defineConnectorTool({
        name: 'github.list_pull_requests',
        providerToolId: 'GITHUB_LIST_PULL_REQUESTS',
        title: 'List pull requests',
        description: 'List pull requests for a selected repository.',
        inputSchemaJson: composioGenericInputSchema,
        outputSchemaJson: composioGenericOutputSchema,
        requiredScopes: ['readOnlyHint'],
      }),
      defineConnectorTool({
        name: 'github.list_commits',
        providerToolId: 'GITHUB_LIST_COMMITS',
        title: 'List commits',
        description: 'List commits for a selected repository or branch.',
        inputSchemaJson: composioGenericInputSchema,
        outputSchemaJson: composioGenericOutputSchema,
        requiredScopes: ['readOnlyHint'],
      }),
    ],
    allowedToolNames: ['github.search_issues_and_pull_requests', 'github.list_pull_requests', 'github.list_commits'],
    authentication: 'composio',
    featuredToolNames: ['github.search_issues_and_pull_requests', 'github.list_pull_requests', 'github.list_commits'],
    minimumApproval: 'auto',
  },
  {
    id: 'notion',
    name: 'Notion',
    provider: 'composio',
    providerConnectorId: 'NOTION',
    category: 'productivity',
    description: 'Find and read connected Notion pages, databases, blocks, and database query results via Composio.',
    tools: [
      defineConnectorTool({
        name: 'notion.search_page',
        providerToolId: 'NOTION_SEARCH_NOTION_PAGE',
        title: 'Search pages',
        description: 'Search for Notion pages by query.',
        inputSchemaJson: composioGenericInputSchema,
        outputSchemaJson: composioGenericOutputSchema,
        requiredScopes: ['readOnlyHint'],
      }),
      defineConnectorTool({
        name: 'notion.query_database',
        providerToolId: 'NOTION_QUERY_DATABASE',
        title: 'Query database',
        description: 'Read rows from a selected Notion database.',
        inputSchemaJson: composioGenericInputSchema,
        outputSchemaJson: composioGenericOutputSchema,
        requiredScopes: ['readOnlyHint'],
      }),
      defineConnectorTool({
        name: 'notion.fetch_page',
        providerToolId: 'NOTION_FETCH_PAGE',
        title: 'Fetch page',
        description: 'Fetch content and metadata for a selected Notion page.',
        inputSchemaJson: composioGenericInputSchema,
        outputSchemaJson: composioGenericOutputSchema,
        requiredScopes: ['readOnlyHint'],
      }),
    ],
    allowedToolNames: ['notion.search_page', 'notion.query_database', 'notion.fetch_page'],
    authentication: 'composio',
    featuredToolNames: ['notion.search_page', 'notion.query_database', 'notion.fetch_page'],
    minimumApproval: 'auto',
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    provider: 'composio',
    providerConnectorId: 'GOOGLEDRIVE',
    category: 'files',
    description: 'Find and inspect files, folders, permissions, comments, changes, and labels in connected Google Drive accounts via Composio.',
    tools: [
      defineConnectorTool({
        name: 'google_drive.find_file',
        providerToolId: 'GOOGLEDRIVE_FIND_FILE',
        title: 'Find file',
        description: 'Find Google Drive files by query or metadata.',
        inputSchemaJson: composioGenericInputSchema,
        outputSchemaJson: composioGenericOutputSchema,
        requiredScopes: ['readOnlyHint'],
      }),
      defineConnectorTool({
        name: 'google_drive.list_files_and_folders',
        providerToolId: 'GOOGLEDRIVE_LIST_FILES_AND_FOLDERS',
        title: 'List files and folders',
        description: 'List files and folders visible to the connected account.',
        inputSchemaJson: composioGenericInputSchema,
        outputSchemaJson: composioGenericOutputSchema,
        requiredScopes: ['readOnlyHint'],
      }),
      defineConnectorTool({
        name: 'google_drive.get_file',
        providerToolId: 'GOOGLEDRIVE_GET_FILE',
        title: 'Get file',
        description: 'Fetch metadata or content reference for a selected file.',
        inputSchemaJson: composioGenericInputSchema,
        outputSchemaJson: composioGenericOutputSchema,
        requiredScopes: ['readOnlyHint'],
      }),
    ],
    allowedToolNames: ['google_drive.find_file', 'google_drive.list_files_and_folders', 'google_drive.get_file'],
    authentication: 'composio',
    featuredToolNames: ['google_drive.find_file', 'google_drive.list_files_and_folders', 'google_drive.get_file'],
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
    ...(tool.providerToolId === undefined ? {} : { providerToolId: tool.providerToolId }),
  };
}

function cloneCatalogDefinition(definition: ConnectorCatalogDefinition): ConnectorCatalogDefinition {
  return {
    id: definition.id,
    name: definition.name,
    provider: definition.provider,
    ...(definition.providerConnectorId === undefined ? {} : { providerConnectorId: definition.providerConnectorId }),
    category: definition.category,
    ...(definition.description === undefined ? {} : { description: definition.description }),
    tools: definition.tools.map((tool) => cloneToolDefinition(tool)),
    allowedToolNames: [...definition.allowedToolNames],
    ...(definition.authentication === undefined ? {} : { authentication: definition.authentication }),
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
    auth: {
      provider: definition.authentication ?? (definition.provider === 'open-design' ? 'local' : 'oauth'),
      configured: definition.authentication === 'local' || definition.authentication === 'none',
    },
  };
}
