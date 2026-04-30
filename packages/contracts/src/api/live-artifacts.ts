import type { JsonPrimitive } from '../common';

export type BoundedJsonValue =
  | JsonPrimitive
  | BoundedJsonValue[]
  | { [key: string]: BoundedJsonValue };

export interface BoundedJsonObject {
  [key: string]: BoundedJsonValue;
}

export type LiveArtifactStatus = 'active' | 'archived' | 'error';

export type LiveArtifactRefreshStatus = 'never' | 'idle' | 'running' | 'succeeded' | 'failed';

export type LiveArtifactPreviewType = 'html' | 'jsx' | 'markdown';

export type LiveArtifactTileKind =
  | 'metric'
  | 'table'
  | 'chart'
  | 'markdown'
  | 'link_card'
  | 'json'
  | 'html_document';

export type LiveArtifactTileRefreshStatus =
  | 'not_refreshable'
  | 'idle'
  | 'running'
  | 'succeeded'
  | 'failed';

export type LiveArtifactSourceType = 'local_file' | 'daemon_tool' | 'connector_tool';

export type LiveArtifactConnectorApprovalPolicy =
  | 'read_only_auto'
  | 'manual_refresh_granted_for_read_only';

export type LiveArtifactRefreshPermission = 'none' | 'manual_refresh_granted_for_read_only';

export type LiveArtifactOutputTransform = 'identity' | 'compact_table' | 'metric_summary';

export type LiveArtifactProvenanceGenerator = 'agent' | 'refresh_runner';

export type LiveArtifactProvenanceSourceType = 'connector' | 'local_file' | 'user_input' | 'derived';

export interface LiveArtifactPreview {
  type: LiveArtifactPreviewType;
  entry: string;
}

export interface LiveArtifactDocument {
  format: 'html_template_v1';
  templatePath: 'template.html';
  generatedPreviewPath: 'index.html';
  dataPath: 'data.json';
  /** Derived cache hydrated from dataPath in API responses; data.json is canonical. */
  dataJson: BoundedJsonObject;
  dataSchemaJson?: BoundedJsonObject;
  sourceJson?: LiveArtifactTileSource;
}

export interface LiveArtifactTile {
  id: string;
  kind: LiveArtifactTileKind;
  title: string;
  renderJson: LiveArtifactRenderJson;
  sourceJson?: LiveArtifactTileSource;
  provenanceJson: LiveArtifactProvenance;
  refreshStatus: LiveArtifactTileRefreshStatus;
  lastError?: string;
}

export type LiveArtifactRenderJson =
  | LiveArtifactMetricRenderJson
  | LiveArtifactTableRenderJson
  | LiveArtifactChartRenderJson
  | LiveArtifactMarkdownRenderJson
  | LiveArtifactLinkCardRenderJson
  | LiveArtifactJsonRenderJson
  | LiveArtifactHtmlDocumentRenderJson;

export interface LiveArtifactMetricRenderJson {
  type: 'metric';
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  tone?: 'neutral' | 'good' | 'warning' | 'bad';
}

export interface LiveArtifactTableRenderJson {
  type: 'table';
  columns: Array<{ key: string; label: string }>;
  rows: BoundedJsonObject[];
  maxRows?: number;
}

export interface LiveArtifactChartRenderJson {
  type: 'chart';
  chartType: 'bar' | 'line' | 'area' | 'pie';
  xKey: string;
  yKeys: string[];
  rows: BoundedJsonObject[];
}

export interface LiveArtifactMarkdownRenderJson {
  type: 'markdown';
  markdown: string;
}

export interface LiveArtifactLinkCardRenderJson {
  type: 'link_card';
  title: string;
  url: string;
  description?: string;
}

export interface LiveArtifactJsonRenderJson {
  type: 'json';
  value: BoundedJsonValue;
}

export interface LiveArtifactHtmlDocumentRenderJson {
  type: 'html_document';
  documentPath: 'template.html' | 'index.html';
  dataPath: 'data.json';
}

export interface LiveArtifactTileSource {
  type: LiveArtifactSourceType;
  toolName?: string;
  input: BoundedJsonObject;
  connector?: {
    connectorId: string;
    accountLabel?: string;
    toolName: string;
    approvalPolicy: LiveArtifactConnectorApprovalPolicy;
  };
  outputMapping?: {
    dataPaths?: Array<{ from: string; to: string }>;
    transform?: LiveArtifactOutputTransform;
  };
  refreshPermission: LiveArtifactRefreshPermission;
}

export interface LiveArtifactProvenanceSource {
  label: string;
  type: LiveArtifactProvenanceSourceType;
  ref?: string;
}

export interface LiveArtifactProvenance {
  generatedAt: string;
  generatedBy: LiveArtifactProvenanceGenerator;
  notes?: string;
  sources: LiveArtifactProvenanceSource[];
}

export interface LiveArtifact {
  schemaVersion: 1;
  id: string;
  projectId: string;
  sessionId?: string;
  createdByRunId?: string;
  title: string;
  slug: string;
  status: LiveArtifactStatus;
  pinned: boolean;
  preview: LiveArtifactPreview;
  refreshStatus: LiveArtifactRefreshStatus;
  createdAt: string;
  updatedAt: string;
  lastRefreshedAt?: string;
  tiles: LiveArtifactTile[];
  document?: LiveArtifactDocument;
}

export type LiveArtifactDaemonOwnedInputField =
  | 'id'
  | 'projectId'
  | 'createdAt'
  | 'updatedAt'
  | 'createdByRunId'
  | 'schemaVersion'
  | 'refreshStatus'
  | 'lastRefreshedAt';

export type LiveArtifactRejectDaemonOwnedInputFields = {
  [Field in LiveArtifactDaemonOwnedInputField]?: never;
};

export type LiveArtifactCreateInput = LiveArtifactRejectDaemonOwnedInputFields & {
  title: string;
  slug?: string;
  sessionId?: string;
  pinned?: boolean;
  status?: LiveArtifactStatus;
  preview: LiveArtifactPreview;
  tiles?: LiveArtifactTile[];
  document?: LiveArtifactDocument;
};

export type LiveArtifactUpdateInput = LiveArtifactRejectDaemonOwnedInputFields & {
  title?: string;
  slug?: string;
  pinned?: boolean;
  status?: LiveArtifactStatus;
  preview?: LiveArtifactPreview;
  tiles?: LiveArtifactTile[];
  document?: LiveArtifactDocument;
};

export type LiveArtifactSummary = Omit<LiveArtifact, 'document' | 'tiles'> & {
  tileCount: number;
  hasDocument: boolean;
};

export interface LiveArtifactListResponse {
  liveArtifacts: LiveArtifactSummary[];
}

export interface LiveArtifactDetailResponse {
  liveArtifact: LiveArtifact;
}
