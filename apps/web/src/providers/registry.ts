import type {
  ConnectorDetail,
  ConnectorConnectResponse,
  ConnectorDetailResponse,
  ConnectorListResponse,
} from '@open-design/contracts';
import type {
  AgentInfo,
  ChatAttachment,
  DesignSystemDetail,
  DesignSystemSummary,
  LiveArtifact,
  LiveArtifactSummary,
  ProjectFile,
  SkillDetail,
  SkillSummary,
} from '../types';
import type { ArtifactManifest } from '../artifacts/types';

export async function fetchAgents(): Promise<AgentInfo[]> {
  try {
    const resp = await fetch('/api/agents');
    if (!resp.ok) return [];
    const json = (await resp.json()) as { agents: AgentInfo[] };
    return json.agents ?? [];
  } catch {
    return [];
  }
}

export async function fetchSkills(): Promise<SkillSummary[]> {
  try {
    const resp = await fetch('/api/skills');
    if (!resp.ok) return [];
    const json = (await resp.json()) as { skills: SkillSummary[] };
    return json.skills ?? [];
  } catch {
    return [];
  }
}

export async function fetchSkill(id: string): Promise<SkillDetail | null> {
  try {
    const resp = await fetch(`/api/skills/${encodeURIComponent(id)}`);
    if (!resp.ok) return null;
    return (await resp.json()) as SkillDetail;
  } catch {
    return null;
  }
}

export async function fetchDesignSystems(): Promise<DesignSystemSummary[]> {
  try {
    const resp = await fetch('/api/design-systems');
    if (!resp.ok) return [];
    const json = (await resp.json()) as { designSystems: DesignSystemSummary[] };
    return json.designSystems ?? [];
  } catch {
    return [];
  }
}

export async function fetchDesignSystem(id: string): Promise<DesignSystemDetail | null> {
  try {
    const resp = await fetch(`/api/design-systems/${encodeURIComponent(id)}`);
    if (!resp.ok) return null;
    return (await resp.json()) as DesignSystemDetail;
  } catch {
    return null;
  }
}

export async function daemonIsLive(): Promise<boolean> {
  try {
    const resp = await fetch('/api/health');
    return resp.ok;
  } catch {
    return false;
  }
}

export async function fetchConnectors(): Promise<ConnectorDetail[]> {
  try {
    const resp = await fetch('/api/connectors');
    if (!resp.ok) return [];
    const json = (await resp.json()) as ConnectorListResponse;
    return json.connectors ?? [];
  } catch {
    return [];
  }
}

export async function connectConnector(connectorId: string): Promise<ConnectorDetail | null> {
  let authWindow: Window | null = null;
  try {
    authWindow = window.open('about:blank', '_blank');
    const resp = await fetch(`/api/connectors/${encodeURIComponent(connectorId)}/connect`, {
      method: 'POST',
    });
    if (!resp.ok) {
      authWindow?.close();
      return null;
    }
    const json = (await resp.json()) as ConnectorConnectResponse;
    if (json.auth?.kind === 'redirect_required' && json.auth.redirectUrl) {
      if (authWindow) {
        authWindow.location.href = json.auth.redirectUrl;
      } else {
        window.open(json.auth.redirectUrl, '_blank');
      }
    } else {
      authWindow?.close();
    }
    return json.connector ?? null;
  } catch {
    authWindow?.close();
    return null;
  }
}

export async function disconnectConnector(connectorId: string): Promise<ConnectorDetail | null> {
  try {
    const resp = await fetch(`/api/connectors/${encodeURIComponent(connectorId)}/connection`, {
      method: 'DELETE',
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as ConnectorDetailResponse;
    return json.connector ?? null;
  } catch {
    return null;
  }
}

export async function fetchSkillExample(id: string): Promise<string | null> {
  try {
    const resp = await fetch(`/api/skills/${encodeURIComponent(id)}/example`);
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

// Project files — all paths are scoped under .od/projects/<id>/ on disk.

export async function fetchProjectFiles(projectId: string): Promise<ProjectFile[]> {
  try {
    const resp = await fetch(`/api/projects/${encodeURIComponent(projectId)}/files`);
    if (!resp.ok) return [];
    const json = (await resp.json()) as { files: ProjectFile[] };
    return json.files ?? [];
  } catch {
    return [];
  }
}

export async function fetchLiveArtifacts(projectId: string): Promise<LiveArtifactSummary[]> {
  try {
    const resp = await fetch(`/api/live-artifacts?projectId=${encodeURIComponent(projectId)}`);
    if (!resp.ok) return [];
    const json = (await resp.json()) as {
      artifacts?: LiveArtifactSummary[];
      liveArtifacts?: LiveArtifactSummary[];
    };
    return json.liveArtifacts ?? json.artifacts ?? [];
  } catch {
    return [];
  }
}

export async function fetchLiveArtifact(
  projectId: string,
  artifactId: string,
): Promise<LiveArtifact | null> {
  try {
    const resp = await fetch(liveArtifactDetailUrl(projectId, artifactId));
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      artifact?: LiveArtifact;
      liveArtifact?: LiveArtifact;
    };
    return json.liveArtifact ?? json.artifact ?? null;
  } catch {
    return null;
  }
}

export interface LiveArtifactRefreshResult {
  artifact: LiveArtifact;
  refresh: {
    id: string;
    status: 'succeeded';
    refreshedTileCount: number;
  };
}

export class LiveArtifactRefreshError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'LiveArtifactRefreshError';
  }
}

export async function refreshLiveArtifact(
  projectId: string,
  artifactId: string,
): Promise<LiveArtifactRefreshResult> {
  let resp: Response;
  try {
    resp = await fetch(
      `/api/live-artifacts/${encodeURIComponent(artifactId)}/refresh?projectId=${encodeURIComponent(projectId)}`,
      { method: 'POST' },
    );
  } catch (error) {
    throw new LiveArtifactRefreshError(
      error instanceof Error ? error.message : 'Refresh request failed.',
      0,
    );
  }

  if (!resp.ok) {
    const errorBody = await readApiErrorBody(resp);
    throw new LiveArtifactRefreshError(errorBody.message, resp.status, errorBody.code);
  }

  return (await resp.json()) as LiveArtifactRefreshResult;
}

export async function updateLiveArtifact(
  projectId: string,
  artifactId: string,
  input: Pick<LiveArtifact, 'title' | 'status' | 'pinned' | 'preview' | 'tiles'> & {
    slug?: string;
    document?: LiveArtifact['document'];
  },
): Promise<LiveArtifact> {
  let resp: Response;
  try {
    resp = await fetch(
      `/api/live-artifacts/${encodeURIComponent(artifactId)}?projectId=${encodeURIComponent(projectId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
    );
  } catch (error) {
    throw new LiveArtifactRefreshError(
      error instanceof Error ? error.message : 'Update request failed.',
      0,
    );
  }

  if (!resp.ok) {
    const errorBody = await readApiErrorBody(resp);
    throw new LiveArtifactRefreshError(errorBody.message, resp.status, errorBody.code);
  }

  const json = (await resp.json()) as { artifact?: LiveArtifact; liveArtifact?: LiveArtifact };
  const artifact = json.liveArtifact ?? json.artifact;
  if (!artifact) throw new LiveArtifactRefreshError('Update response did not include a live artifact.', resp.status);
  return artifact;
}

async function readApiErrorBody(resp: Response): Promise<{ message: string; code?: string }> {
  try {
    const json = (await resp.json()) as { error?: { code?: string; message?: string }; message?: string };
    const message = json.error?.message ?? json.message;
    return {
      message: typeof message === 'string' && message.length > 0 ? message : `Request failed (${resp.status}).`,
      ...(typeof json.error?.code === 'string' ? { code: json.error.code } : {}),
    };
  } catch {
    return { message: `Request failed (${resp.status}).` };
  }
}

export function liveArtifactDetailUrl(projectId: string, artifactId: string): string {
  return `/api/live-artifacts/${encodeURIComponent(artifactId)}?projectId=${encodeURIComponent(projectId)}`;
}

export function liveArtifactPreviewUrl(projectId: string, artifactId: string): string {
  return `/api/live-artifacts/${encodeURIComponent(artifactId)}/preview?projectId=${encodeURIComponent(projectId)}`;
}

export function projectFileUrl(projectId: string, name: string): string {
  return projectRawUrl(projectId, name);
}

export interface ProjectFilePreviewSection {
  title: string;
  lines: string[];
}

export interface ProjectFilePreview {
  kind: 'pdf' | 'document' | 'presentation' | 'spreadsheet';
  title: string;
  sections: ProjectFilePreviewSection[];
}

export async function fetchProjectFilePreview(
  projectId: string,
  name: string,
): Promise<ProjectFilePreview | null> {
  try {
    const resp = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(name)}/preview`,
    );
    if (!resp.ok) return null;
    return (await resp.json()) as ProjectFilePreview;
  } catch {
    return null;
  }
}

export async function fetchProjectFileText(
  projectId: string,
  name: string,
): Promise<string | null> {
  try {
    const resp = await fetch(projectFileUrl(projectId, name));
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

export async function writeProjectTextFile(
  projectId: string,
  name: string,
  content: string,
  options?: { artifactManifest?: ArtifactManifest },
): Promise<ProjectFile | null> {
  try {
    const resp = await fetch(`/api/projects/${encodeURIComponent(projectId)}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content, artifactManifest: options?.artifactManifest }),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { file: ProjectFile };
    return json.file;
  } catch {
    return null;
  }
}

export async function writeProjectBase64File(
  projectId: string,
  name: string,
  base64: string,
): Promise<ProjectFile | null> {
  try {
    const resp = await fetch(`/api/projects/${encodeURIComponent(projectId)}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content: base64, encoding: 'base64' }),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { file: ProjectFile };
    return json.file;
  } catch {
    return null;
  }
}

export async function uploadProjectFile(
  projectId: string,
  file: File,
  desiredName?: string,
): Promise<ProjectFile | null> {
  try {
    const form = new FormData();
    form.append('file', file);
    if (desiredName) form.append('name', desiredName);
    const resp = await fetch(`/api/projects/${encodeURIComponent(projectId)}/files`, {
      method: 'POST',
      body: form,
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { file: ProjectFile };
    return json.file;
  } catch {
    return null;
  }
}

// Multi-file project upload used by the chat composer's paste / drop /
// picker. Each file lands flat in the project folder; the response is
// reshaped into ChatAttachments so the composer can stage them without a
// follow-up listFiles round-trip.
const PROJECT_UPLOAD_BATCH_SIZE = 12;

export interface ProjectUploadFailure {
  name: string;
  code?: string;
  error?: string;
}

export interface UploadProjectFilesResult {
  uploaded: ChatAttachment[];
  failed: ProjectUploadFailure[];
  error?: string;
}

export async function uploadProjectFiles(
  projectId: string,
  files: File[],
): Promise<UploadProjectFilesResult> {
  if (files.length === 0) return { uploaded: [], failed: [] };

  const uploaded: ChatAttachment[] = [];
  const failed: ProjectUploadFailure[] = [];
  let error: string | undefined;

  for (let i = 0; i < files.length; i += PROJECT_UPLOAD_BATCH_SIZE) {
    const batch = files.slice(i, i + PROJECT_UPLOAD_BATCH_SIZE);
    const remaining = files.slice(i + PROJECT_UPLOAD_BATCH_SIZE);
    const form = new FormData();
    for (const f of batch) form.append('files', f);

    try {
      const resp = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/upload`,
        { method: 'POST', body: form },
      );

      if (!resp.ok) {
        const payload = (await resp.json().catch(() => null)) as
          | { code?: string; error?: string }
          | null;
        error = payload?.error ?? `upload failed (${resp.status})`;
        for (const f of batch) {
          failed.push({ name: f.name, code: payload?.code, error: error });
        }
        for (const f of remaining) {
          failed.push({ name: f.name, code: payload?.code, error: error });
        }
        break;
      }

      const json = (await resp.json()) as {
        files: { name: string; path: string; size?: number; originalName?: string }[];
      };
      uploaded.push(
        ...(json.files ?? []).map((f) => ({
          path: f.path,
          name: f.originalName ?? f.name,
          kind: looksLikeImage(f.name) ? ('image' as const) : ('file' as const),
          size: f.size,
        })),
      );
      const uploadedNames = new Map<string, number>();
      for (const f of json.files ?? []) {
        const key = f.originalName ?? f.name;
        uploadedNames.set(key, (uploadedNames.get(key) ?? 0) + 1);
      }
      for (const f of batch) {
        const count = uploadedNames.get(f.name) ?? 0;
        if (count > 0) {
          uploadedNames.set(f.name, count - 1);
          continue;
        }
        error ??= 'some files could not be stored';
        failed.push({ name: f.name, error: error });
      }
    } catch {
      error = 'upload request failed';
      for (const f of batch) {
        failed.push({ name: f.name, error });
      }
      for (const f of remaining) {
        failed.push({ name: f.name, error });
      }
      break;
    }
  }

  return { uploaded, failed, error };
}

// Stable URL that serves a project file with its original mime — for
// thumbnails in the staged-attachment chips and for any preview iframe
// that needs to point at the live file (not a srcDoc).
export function projectRawUrl(projectId: string, filePath: string): string {
  // Encode each path segment individually so a slash inside the file
  // path stays a path separator, not %2F.
  const safePath = filePath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `/api/projects/${encodeURIComponent(projectId)}/raw/${safePath}`;
}

function looksLikeImage(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i.test(name);
}

export async function deleteProjectFile(
  projectId: string,
  name: string,
): Promise<boolean> {
  try {
    const resp = await fetch(
      projectRawUrl(projectId, name),
      { method: 'DELETE' },
    );
    return resp.ok;
  } catch {
    return false;
  }
}

export async function fetchDesignSystemPreview(id: string): Promise<string | null> {
  try {
    const resp = await fetch(`/api/design-systems/${encodeURIComponent(id)}/preview`);
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

export async function fetchDesignSystemShowcase(id: string): Promise<string | null> {
  try {
    const resp = await fetch(`/api/design-systems/${encodeURIComponent(id)}/showcase`);
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}
