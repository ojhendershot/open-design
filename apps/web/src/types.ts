import type {
  AgentInfo,
  AppVersionInfo,
  AppVersionResponse,
  AudioKind,
  ChatAttachment,
  ChatMessage,
  Conversation,
  DeployConfigResponse,
  DeployProjectFileResponse,
  DesignSystemDetail,
  DesignSystemSummary,
  LiveArtifact,
  LiveArtifactDetailResponse,
  LiveArtifactListResponse,
  LiveArtifactPreview,
  LiveArtifactRefreshStatus,
  LiveArtifactStatus,
  LiveArtifactSummary,
  LiveArtifactTile,
  LiveArtifactTileRefreshStatus,
  MediaAspect,
  ProjectDeploymentsResponse,
  PersistedAgentEvent,
  Project,
  ProjectDisplayStatus,
  ProjectFile,
  ProjectFileKind,
  ProjectKind,
  ProjectMetadata,
  ProjectTemplate,
  SkillDetail,
  SkillSummary,
  UpdateDeployConfigRequest,
} from '@open-design/contracts';

export type ExecMode = 'daemon' | 'api';

export type LiveArtifactTabId = `live:${string}`;
export type ProjectWorkspaceTabId = string | LiveArtifactTabId;

export function liveArtifactTabId(artifactId: string): LiveArtifactTabId {
  return `live:${artifactId}`;
}

export function isLiveArtifactTabId(tabId: string): tabId is LiveArtifactTabId {
  return tabId.startsWith('live:') && tabId.length > 'live:'.length;
}

export function liveArtifactIdFromTabId(tabId: LiveArtifactTabId): string {
  return tabId.slice('live:'.length);
}

export type LiveArtifactViewerTab =
  | 'preview'
  | 'source'
  | 'data'
  | 'provenance'
  | 'refresh-history';

export interface ProjectFileWorkspaceEntry {
  kind: 'file';
  tabId: string;
  name: string;
  file: ProjectFile;
}

export interface LiveArtifactWorkspaceEntry {
  kind: 'live-artifact';
  tabId: LiveArtifactTabId;
  artifactId: string;
  projectId: string;
  title: string;
  slug: string;
  status: LiveArtifactStatus;
  refreshStatus: LiveArtifactRefreshStatus;
  pinned: boolean;
  preview: LiveArtifactPreview;
  tileCount: number;
  hasDocument: boolean;
  updatedAt: string;
  lastRefreshedAt?: string;
}

export type ProjectWorkspaceEntry = ProjectFileWorkspaceEntry | LiveArtifactWorkspaceEntry;

export function liveArtifactSummaryToWorkspaceEntry(
  liveArtifact: LiveArtifactSummary,
): LiveArtifactWorkspaceEntry {
  const entry: LiveArtifactWorkspaceEntry = {
    kind: 'live-artifact',
    tabId: liveArtifactTabId(liveArtifact.id),
    artifactId: liveArtifact.id,
    projectId: liveArtifact.projectId,
    title: liveArtifact.title,
    slug: liveArtifact.slug,
    status: liveArtifact.status,
    refreshStatus: liveArtifact.refreshStatus,
    pinned: liveArtifact.pinned,
    preview: liveArtifact.preview,
    tileCount: liveArtifact.tileCount,
    hasDocument: liveArtifact.hasDocument,
    updatedAt: liveArtifact.updatedAt,
  };
  if (liveArtifact.lastRefreshedAt) entry.lastRefreshedAt = liveArtifact.lastRefreshedAt;
  return entry;
}

export interface LiveArtifactPreviewRequest {
  projectId: string;
  artifactId: string;
  previewUrl: string;
}

export interface MediaProviderCredentials {
  apiKey: string;
  baseUrl: string;
}

// Per-CLI model + reasoning the user picked in the model menu. Each agent
// keeps its own slot so flipping between Codex and Gemini doesn't reset the
// other one's choice. Missing entries fall back to the agent's first
// declared model (`'default'` — let the CLI pick).
export interface AgentModelChoice {
  model?: string;
  reasoning?: string;
}

export interface AppConfig {
  mode: ExecMode;
  apiKey: string;
  baseUrl: string;
  model: string;
  agentId: string | null;
  skillId: string | null;
  designSystemId: string | null;
  // True once the user has been through the welcome onboarding modal at
  // least once (saved or skipped). Bootstrap skips the auto-popup when
  // this is set so refreshing the page doesn't re-prompt.
  onboardingCompleted?: boolean;
  mediaProviders?: Record<string, MediaProviderCredentials>;
  // Per-CLI model picker state, keyed by agent id (e.g. `gemini`, `codex`).
  // Pre-existing configs without this field fall through to the agent's
  // declared default.
  agentModels?: Record<string, AgentModelChoice>;
}

export type AgentEvent = PersistedAgentEvent;

export type { ChatAttachment, ChatMessage };

export interface Artifact {
  identifier: string;
  title: string;
  html: string;
  savedUrl?: string;
}

export interface ExamplePreview {
  source: 'skill' | 'design-system';
  id: string;
  title: string;
  html: string;
}

export interface AgentModelOption {
  id: string;
  label: string;
}

export type Surface = 'web' | 'image' | 'video' | 'audio';

export interface PromptTemplateSource {
  repo: string;
  license: string;
  author?: string;
  url?: string;
}

export interface PromptTemplateSummary {
  id: string;
  surface: 'image' | 'video';
  title: string;
  summary: string;
  category: string;
  tags?: string[];
  model?: string;
  aspect?: MediaAspect;
  previewImageUrl?: string;
  previewVideoUrl?: string;
  source: PromptTemplateSource;
}

export interface PromptTemplateDetail extends PromptTemplateSummary {
  prompt: string;
}

export type {
  AgentInfo,
  AppVersionInfo,
  AppVersionResponse,
  AudioKind,
  Conversation,
  DeployConfigResponse,
  DeployProjectFileResponse,
  DesignSystemDetail,
  DesignSystemSummary,
  LiveArtifact,
  LiveArtifactDetailResponse,
  LiveArtifactListResponse,
  LiveArtifactRefreshStatus,
  LiveArtifactStatus,
  LiveArtifactSummary,
  LiveArtifactTile,
  LiveArtifactTileRefreshStatus,
  MediaAspect,
  ProjectDeploymentsResponse,
  Project,
  ProjectDisplayStatus,
  ProjectFile,
  ProjectFileKind,
  ProjectKind,
  ProjectMetadata,
  ProjectTemplate,
  SkillDetail,
  SkillSummary,
  UpdateDeployConfigRequest,
};

export interface OpenTabsState {
  tabs: ProjectWorkspaceTabId[];
  active: ProjectWorkspaceTabId | null;
}
