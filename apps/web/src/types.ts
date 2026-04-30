import type {
  AgentInfo,
  ChatAttachment,
  ChatMessage,
  Conversation,
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
  PersistedAgentEvent,
  Project,
  ProjectFile,
  ProjectFileKind,
  ProjectKind,
  ProjectMetadata,
  ProjectTemplate,
  SkillDetail,
  SkillSummary,
} from '@open-design/contracts';

export type ExecMode = 'daemon' | 'api';

export type LiveArtifactTabId = `live:${string}`;

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

export interface LiveArtifactPreviewRequest {
  projectId: string;
  artifactId: string;
  previewUrl: string;
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

export type {
  AgentInfo,
  Conversation,
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
  Project,
  ProjectFile,
  ProjectFileKind,
  ProjectKind,
  ProjectMetadata,
  ProjectTemplate,
  SkillDetail,
  SkillSummary,
};

export interface OpenTabsState {
  tabs: string[];
  active: string | null;
}
