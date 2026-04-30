import { useEffect, useMemo, useRef, useState } from 'react';
import { artifactRendererRegistry } from '../artifacts/renderer-registry';
import { useT } from '../i18n';
import type { Dict } from '../i18n/types';
import {
  fetchLiveArtifact,
  fetchProjectFilePreview,
  fetchProjectFileText,
  liveArtifactPreviewUrl,
  projectFileUrl,
  projectRawUrl,
  LiveArtifactRefreshError,
  refreshLiveArtifact,
  updateLiveArtifact,
} from '../providers/registry';
import type { ProjectFilePreview } from '../providers/registry';
import { exportAsHtml, exportAsPdf, exportAsZip } from '../runtime/exports';
import { buildSrcdoc } from '../runtime/srcdoc';
import { saveTemplate } from '../state/projects';
import type { AgentEvent, LiveArtifact, LiveArtifactViewerTab, LiveArtifactWorkspaceEntry, ProjectFile } from '../types';
import { Icon } from './Icon';

type TranslateFn = (key: keyof Dict, vars?: Record<string, string | number>) => string;

interface Props {
  projectId: string;
  file: ProjectFile;
  liveHtml?: string;
  isDeck?: boolean;
  onExportAsPptx?: ((fileName: string) => void) | undefined;
  streaming?: boolean;
}

export function FileViewer({
  projectId,
  file,
  liveHtml,
  isDeck,
  onExportAsPptx,
  streaming,
}: Props) {
  const rendererMatch = artifactRendererRegistry.resolve({
    file,
    isDeckHint: Boolean(isDeck),
  });

  if (rendererMatch?.renderer.id === 'html' || rendererMatch?.renderer.id === 'deck-html') {
    return (
      <HtmlViewer
        projectId={projectId}
        file={file}
        liveHtml={liveHtml}
        isDeck={rendererMatch.renderer.id === 'deck-html'}
        onExportAsPptx={onExportAsPptx}
        streaming={Boolean(streaming)}
      />
    );
  }
  if (file.kind === 'image') {
    return <ImageViewer projectId={projectId} file={file} />;
  }
  if (file.kind === 'sketch') {
    return <ImageViewer projectId={projectId} file={file} />;
  }
  if (file.kind === 'text' || file.kind === 'code') {
    return <TextViewer projectId={projectId} file={file} />;
  }
  if (
    file.kind === 'pdf' ||
    file.kind === 'document' ||
    file.kind === 'presentation' ||
    file.kind === 'spreadsheet'
  ) {
    return <DocumentPreviewViewer projectId={projectId} file={file} />;
  }
  return <BinaryViewer projectId={projectId} file={file} />;
}

export function LiveArtifactViewer({
  projectId,
  liveArtifact,
  liveArtifactEvent,
  onRefreshArtifacts,
}: {
  projectId: string;
  liveArtifact: LiveArtifactWorkspaceEntry;
  liveArtifactEvent?: AgentEvent | null;
  onRefreshArtifacts?: () => Promise<void> | void;
}) {
  const t = useT();
  const [mode, setMode] = useState<LiveArtifactViewerTab>('preview');
  const [detail, setDetail] = useState<LiveArtifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshSuccess, setRefreshSuccess] = useState<string | null>(null);

  useEffect(() => {
    setRefreshError(null);
    setRefreshSuccess(null);
  }, [projectId, liveArtifact.artifactId]);

  useEffect(() => {
    if (!refreshSuccess) return;
    const timeout = window.setTimeout(() => setRefreshSuccess(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [refreshSuccess]);

  useEffect(() => {
    if (!liveArtifactEvent) return;
    if (
      (liveArtifactEvent.kind !== 'live_artifact' && liveArtifactEvent.kind !== 'live_artifact_refresh') ||
      liveArtifactEvent.projectId !== projectId ||
      liveArtifactEvent.artifactId !== liveArtifact.artifactId
    ) {
      return;
    }

    if (liveArtifactEvent.kind === 'live_artifact') {
      setRefreshError(null);
      setRefreshSuccess(
        liveArtifactEvent.action === 'created'
          ? `Live artifact created: ${liveArtifactEvent.title}`
          : `Live artifact updated: ${liveArtifactEvent.title}`,
      );
      void fetchLiveArtifact(projectId, liveArtifact.artifactId).then((next) => {
        if (next) setDetail(next);
      });
      setReloadKey((n) => n + 1);
      return;
    }

    if (liveArtifactEvent.phase === 'started') {
      setRefreshing(true);
      setRefreshError(null);
      setRefreshSuccess(null);
      return;
    }

    if (liveArtifactEvent.phase === 'failed') {
      setRefreshing(false);
      setRefreshError(liveArtifactEvent.error ?? t('liveArtifact.refresh.genericFailure'));
      void fetchLiveArtifact(projectId, liveArtifact.artifactId).then((next) => {
        if (next) setDetail(next);
      });
      return;
    }

    setRefreshing(false);
    setRefreshError(null);
    setRefreshSuccess(
      liveArtifactEvent.refreshedTileCount === 1
        ? t('liveArtifact.refresh.successOne')
        : t('liveArtifact.refresh.successMany', { count: liveArtifactEvent.refreshedTileCount ?? 0 }),
    );
    void fetchLiveArtifact(projectId, liveArtifact.artifactId).then((next) => {
      if (next) setDetail(next);
    });
    setReloadKey((n) => n + 1);
  }, [liveArtifactEvent, liveArtifact.artifactId, projectId, t]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    void fetchLiveArtifact(projectId, liveArtifact.artifactId).then((next) => {
      if (cancelled) return;
      setDetail(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, liveArtifact.artifactId, liveArtifact.updatedAt]);

  const previewUrl = useMemo(
    () => `${liveArtifactPreviewUrl(projectId, liveArtifact.artifactId)}&v=${reloadKey}`,
    [projectId, liveArtifact.artifactId, reloadKey],
  );
  const previewScale = zoom / 100;

  function bumpZoom(delta: number) {
    setZoom((z) => Math.max(25, Math.min(200, z + delta)));
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshError(null);
    setRefreshSuccess(null);
    try {
      let refreshTarget = detail;
      if (refreshTarget && approvedRefreshableTileCount(refreshTarget) === 0 && pendingReadOnlyRefreshTileCount(refreshTarget) > 0) {
        const approved = window.confirm(
          'Approve read-only refresh for this live artifact? The daemon will re-read the listed local/project sources when you refresh. You can revoke this from the Source tab.',
        );
        if (!approved) return;
        refreshTarget = grantReadOnlyRefreshPermission(refreshTarget);
        const updated = await updateLiveArtifact(projectId, liveArtifact.artifactId, liveArtifactUpdateInput(refreshTarget));
        setDetail(updated);
      }
      const result = await refreshLiveArtifact(projectId, liveArtifact.artifactId);
      setDetail(result.artifact);
      setReloadKey((n) => n + 1);
      setRefreshSuccess(
        result.refresh.refreshedTileCount === 1
          ? t('liveArtifact.refresh.successOne')
          : t('liveArtifact.refresh.successMany', { count: result.refresh.refreshedTileCount }),
      );
      await onRefreshArtifacts?.();
    } catch (error) {
      setRefreshError(refreshErrorMessage(error, t));
    } finally {
      setRefreshing(false);
    }
  }

  const sourcePayload = detail ? liveArtifactSourcePayload(detail) : null;
  const dataPayload = detail?.document?.dataJson ?? null;
  const provenancePayload = detail ? liveArtifactProvenancePayload(detail) : null;
  const refreshPayload = detail ? liveArtifactRefreshPayload(detail) : null;
  const currentRefreshStatus = detail?.refreshStatus ?? liveArtifact.refreshStatus;
  const refreshableTileCount = detail ? approvedRefreshableTileCount(detail) : null;
  const pendingRefreshTileCount = detail ? pendingReadOnlyRefreshTileCount(detail) : null;
  const hasRefreshSource = (refreshableTileCount ?? 0) > 0 || (pendingRefreshTileCount ?? 0) > 0;
  const isRunning = refreshing || currentRefreshStatus === 'running';
  const lastTileError = detail?.tiles.find((tile) => tile.lastError)?.lastError ?? null;

  async function handleRevokeRefreshPermission() {
    if (!detail || refreshing || approvedRefreshableTileCount(detail) === 0) return;
    const approved = window.confirm('Revoke manual read-only refresh approval for this live artifact?');
    if (!approved) return;
    setRefreshError(null);
    setRefreshSuccess(null);
    try {
      const updated = await updateLiveArtifact(
        projectId,
        liveArtifact.artifactId,
        liveArtifactUpdateInput(revokeReadOnlyRefreshPermission(detail)),
      );
      setDetail(updated);
      setRefreshSuccess('Refresh approval revoked. You will be asked to approve before the next manual refresh.');
      await onRefreshArtifacts?.();
    } catch (error) {
      setRefreshError(refreshErrorMessage(error, t));
    }
  }

  return (
    <div className="viewer html-viewer live-artifact-viewer">
      <div className="viewer-toolbar">
        <div className="viewer-toolbar-left">
          <button
            type="button"
            className="icon-only"
            onClick={() => setReloadKey((n) => n + 1)}
            title={t('fileViewer.reload')}
            aria-label={t('fileViewer.reloadAria')}
          >
            <Icon name="reload" size={14} />
          </button>
          <span className="viewer-meta">
            Live artifact · {refreshStatusLabel(currentRefreshStatus, t)}
          </span>
        </div>
        <div className="viewer-toolbar-actions">
          <button
            type="button"
            className="viewer-action primary"
            onClick={() => void handleRefresh()}
            disabled={isRunning || loading || !hasRefreshSource}
            aria-busy={isRunning}
            aria-label={isRunning ? t('liveArtifact.refresh.running') : t('liveArtifact.refresh.button')}
            title={
              loading
                ? t('liveArtifact.refresh.loadingTitle')
                : !hasRefreshSource
                  ? t('liveArtifact.refresh.noSourceTitle')
                  : refreshableTileCount === 0
                    ? 'Approve read-only refresh and run it'
                    : t('liveArtifact.refresh.buttonTitle')
            }
          >
            <Icon name={isRunning ? 'spinner' : 'reload'} size={13} />
            <span>{isRunning ? t('liveArtifact.refresh.running') : t('liveArtifact.refresh.button')}</span>
          </button>
          <span className="viewer-divider" aria-hidden />
          <div className="viewer-tabs">
            {LIVE_ARTIFACT_VIEWER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`viewer-tab ${mode === tab.id ? 'active' : ''}`}
                onClick={() => setMode(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="viewer-divider" aria-hidden />
          {mode === 'preview' ? (
            <>
              <button
                type="button"
                className="icon-only"
                onClick={() => bumpZoom(-25)}
                title={t('fileViewer.zoomOut')}
                aria-label={t('fileViewer.zoomOut')}
              >
                <Icon name="minus" size={14} />
              </button>
              <button
                type="button"
                className="viewer-action"
                onClick={() => setZoom(100)}
                title={t('fileViewer.resetZoom')}
                style={{ minWidth: 60 }}
              >
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{zoom}%</span>
              </button>
              <button
                type="button"
                className="icon-only"
                onClick={() => bumpZoom(25)}
                title={t('fileViewer.zoomIn')}
                aria-label={t('fileViewer.zoomIn')}
              >
                <Icon name="plus" size={14} />
              </button>
              <span className="viewer-divider" aria-hidden />
              <a
                className="ghost-link"
                href={liveArtifactPreviewUrl(projectId, liveArtifact.artifactId)}
                target="_blank"
                rel="noreferrer noopener"
              >
                {t('fileViewer.open')}
              </a>
            </>
          ) : null}
        </div>
      </div>
      <div className="viewer-body">
        {refreshError ? (
          <LiveArtifactRefreshNotice
            tone="error"
            message={refreshError}
            action={t('liveArtifact.refresh.failureAction')}
          />
        ) : refreshSuccess ? (
          <LiveArtifactRefreshNotice
            tone="success"
            message={refreshSuccess}
            action={t('liveArtifact.refresh.successAction')}
            onDismiss={() => setRefreshSuccess(null)}
            dismissLabel={t('common.close')}
          />
        ) : isRunning ? (
          <LiveArtifactRefreshNotice
            tone="running"
            message={t('liveArtifact.refresh.runningMessage')}
            action={t('liveArtifact.refresh.runningAction')}
          />
        ) : currentRefreshStatus === 'failed' && lastTileError ? (
          <LiveArtifactRefreshNotice
            tone="error"
            message={t('liveArtifact.refresh.previousFailure', { message: lastTileError })}
            action={t('liveArtifact.refresh.failureAction')}
          />
        ) : null}
        {mode === 'preview' ? (
          <div
            style={{
              width: `${100 / previewScale}%`,
              height: `${100 / previewScale}%`,
              transform: `scale(${previewScale})`,
              transformOrigin: '0 0',
            }}
          >
            <iframe
              data-testid="live-artifact-preview-frame"
              title={liveArtifact.title}
              sandbox="allow-scripts"
              src={previewUrl}
            />
          </div>
        ) : loading ? (
          <div className="viewer-empty">{t('fileViewer.loading')}</div>
        ) : mode === 'source' ? (
          <LiveArtifactSourcePanel
            liveArtifact={detail}
            value={sourcePayload}
            onRevoke={() => void handleRevokeRefreshPermission()}
            revokeDisabled={refreshing || loading}
          />
        ) : mode === 'data' ? (
          <JsonPanel value={dataPayload} emptyLabel="No data.json cache available." />
        ) : mode === 'provenance' ? (
          <JsonPanel value={provenancePayload} emptyLabel="No provenance available." />
        ) : (
          <JsonPanel value={refreshPayload} emptyLabel="No refresh history available yet." />
        )}
      </div>
    </div>
  );
}

function LiveArtifactRefreshNotice({
  tone,
  message,
  action,
  onDismiss,
  dismissLabel,
}: {
  tone: 'running' | 'success' | 'error';
  message: string;
  action: string;
  onDismiss?: () => void;
  dismissLabel?: string;
}) {
  return (
    <div
      className={`live-artifact-refresh-notice ${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-label={`${message} ${action}`}
    >
      <span className="live-artifact-refresh-notice-copy">
        <strong>{message}</strong>
        <span>{action}</span>
      </span>
      {onDismiss ? (
        <button type="button" className="icon-only" onClick={onDismiss} aria-label={dismissLabel}>
          ×
        </button>
      ) : null}
    </div>
  );
}

function refreshStatusLabel(status: LiveArtifact['refreshStatus'], t: TranslateFn): string {
  switch (status) {
    case 'never':
      return t('liveArtifact.refresh.statusNever');
    case 'idle':
      return t('liveArtifact.refresh.statusReady');
    case 'running':
      return t('liveArtifact.refresh.running');
    case 'succeeded':
      return t('liveArtifact.refresh.statusSucceeded');
    case 'failed':
      return t('liveArtifact.refresh.statusFailed');
  }
}

function refreshErrorMessage(error: unknown, t: TranslateFn): string {
  if (error instanceof LiveArtifactRefreshError && error.status === 0) {
    return t('liveArtifact.refresh.networkFailure');
  }
  if (error instanceof Error && error.message.length > 0) return error.message;
  return t('liveArtifact.refresh.genericFailure');
}

const LIVE_ARTIFACT_VIEWER_TABS: Array<{ id: LiveArtifactViewerTab; label: string }> = [
  { id: 'preview', label: 'Preview' },
  { id: 'source', label: 'Source' },
  { id: 'data', label: 'Data' },
  { id: 'provenance', label: 'Provenance' },
  { id: 'refresh-history', label: 'Refresh history' },
];

type LiveArtifactTile = LiveArtifact['tiles'][number];

const READ_ONLY_REFRESH_TOOL_NAMES = new Set([
  'project_files.search',
  'project_files.read_json',
  'git.summary',
]);

function isReadOnlyRefreshEligibleTile(tile: LiveArtifactTile): boolean {
  const source = tile.sourceJson;
  return source?.type === 'daemon_tool'
    && source.toolName !== undefined
    && READ_ONLY_REFRESH_TOOL_NAMES.has(source.toolName);
}

function approvedRefreshableTileCount(liveArtifact: LiveArtifact): number {
  return liveArtifact.tiles.filter((tile) => tile.sourceJson?.refreshPermission === 'manual_refresh_granted_for_read_only').length;
}

function pendingReadOnlyRefreshTileCount(liveArtifact: LiveArtifact): number {
  return liveArtifact.tiles.filter((tile) => (
    tile.sourceJson?.refreshPermission === 'none' && isReadOnlyRefreshEligibleTile(tile)
  )).length;
}

function withReadOnlyRefreshPermission(
  liveArtifact: LiveArtifact,
  refreshPermission: 'none' | 'manual_refresh_granted_for_read_only',
): LiveArtifact {
  return {
    ...liveArtifact,
    tiles: liveArtifact.tiles.map((tile) => {
      if (!tile.sourceJson || !isReadOnlyRefreshEligibleTile(tile)) return tile;
      return {
        ...tile,
        sourceJson: {
          ...tile.sourceJson,
          refreshPermission,
        },
      };
    }),
  };
}

function grantReadOnlyRefreshPermission(liveArtifact: LiveArtifact): LiveArtifact {
  return withReadOnlyRefreshPermission(liveArtifact, 'manual_refresh_granted_for_read_only');
}

function revokeReadOnlyRefreshPermission(liveArtifact: LiveArtifact): LiveArtifact {
  return withReadOnlyRefreshPermission(liveArtifact, 'none');
}

function liveArtifactUpdateInput(liveArtifact: LiveArtifact) {
  return {
    title: liveArtifact.title,
    slug: liveArtifact.slug,
    status: liveArtifact.status,
    pinned: liveArtifact.pinned,
    preview: liveArtifact.preview,
    tiles: liveArtifact.tiles,
    ...(liveArtifact.document === undefined ? {} : { document: liveArtifact.document }),
  };
}

function LiveArtifactSourcePanel({
  liveArtifact,
  value,
  onRevoke,
  revokeDisabled,
}: {
  liveArtifact: LiveArtifact | null;
  value: unknown;
  onRevoke: () => void;
  revokeDisabled: boolean;
}) {
  const approvedCount = liveArtifact ? approvedRefreshableTileCount(liveArtifact) : 0;
  const pendingCount = liveArtifact ? pendingReadOnlyRefreshTileCount(liveArtifact) : 0;

  return (
    <div className="live-artifact-source-panel">
      <div className="live-artifact-source-summary">
        <span>
          Refresh permission: {approvedCount > 0
            ? `manual read-only approval granted for ${approvedCount} source${approvedCount === 1 ? '' : 's'}`
            : pendingCount > 0
              ? `not approved; ${pendingCount} read-only source${pendingCount === 1 ? '' : 's'} can be approved on first refresh`
              : 'none'}
        </span>
        {approvedCount > 0 ? (
          <button
            type="button"
            className="viewer-action"
            onClick={onRevoke}
            disabled={revokeDisabled}
          >
            Revoke refresh approval
          </button>
        ) : null}
      </div>
      <JsonPanel value={value} emptyLabel="No source metadata available." />
    </div>
  );
}

function JsonPanel({ value, emptyLabel }: { value: unknown; emptyLabel: string }) {
  if (value == null) return <div className="viewer-empty">{emptyLabel}</div>;
  return <pre className="viewer-source">{JSON.stringify(value, null, 2)}</pre>;
}

function liveArtifactSourcePayload(liveArtifact: LiveArtifact): unknown {
  return {
    artifact: {
      id: liveArtifact.id,
      title: liveArtifact.title,
      slug: liveArtifact.slug,
      status: liveArtifact.status,
      pinned: liveArtifact.pinned,
      preview: liveArtifact.preview,
      refreshStatus: liveArtifact.refreshStatus,
      createdAt: liveArtifact.createdAt,
      updatedAt: liveArtifact.updatedAt,
      lastRefreshedAt: liveArtifact.lastRefreshedAt,
    },
    document: liveArtifact.document
      ? {
          format: liveArtifact.document.format,
          templatePath: liveArtifact.document.templatePath,
          generatedPreviewPath: liveArtifact.document.generatedPreviewPath,
          dataPath: liveArtifact.document.dataPath,
          dataSchemaJson: liveArtifact.document.dataSchemaJson,
          sourceJson: liveArtifact.document.sourceJson,
        }
      : null,
    tiles: liveArtifact.tiles.map((tile) => ({
      id: tile.id,
      kind: tile.kind,
      title: tile.title,
      refreshStatus: tile.refreshStatus,
      sourceJson: tile.sourceJson,
      lastError: tile.lastError,
    })),
  };
}

function liveArtifactProvenancePayload(liveArtifact: LiveArtifact): unknown {
  return {
    documentSource: liveArtifact.document?.sourceJson ?? null,
    tiles: liveArtifact.tiles.map((tile) => ({
      id: tile.id,
      title: tile.title,
      provenanceJson: tile.provenanceJson,
    })),
  };
}

function liveArtifactRefreshPayload(liveArtifact: LiveArtifact): unknown {
  return {
    refreshStatus: liveArtifact.refreshStatus,
    lastRefreshedAt: liveArtifact.lastRefreshedAt ?? null,
    tiles: liveArtifact.tiles.map((tile) => ({
      id: tile.id,
      title: tile.title,
      refreshStatus: tile.refreshStatus,
      lastError: tile.lastError ?? null,
    })),
  };
}

function FileActions({
  projectId,
  file,
}: {
  projectId: string;
  file: ProjectFile;
}) {
  const t = useT();
  return (
    <div className="viewer-toolbar-actions">
      <a
        className="ghost-link"
        href={projectFileUrl(projectId, file.name)}
        download={file.name}
      >
        {t('fileViewer.download')}
      </a>
      <a
        className="ghost-link"
        href={projectFileUrl(projectId, file.name)}
        target="_blank"
        rel="noreferrer noopener"
      >
        {t('fileViewer.open')}
      </a>
    </div>
  );
}

function BinaryViewer({
  projectId,
  file,
}: {
  projectId: string;
  file: ProjectFile;
}) {
  const t = useT();
  return (
    <div className="viewer binary-viewer">
      <div className="viewer-toolbar">
        <div className="viewer-toolbar-left">
          <span className="viewer-meta">
            {t('fileViewer.binaryMeta', { size: humanSize(file.size) })}
          </span>
        </div>
        <FileActions projectId={projectId} file={file} />
      </div>
      <div className="viewer-body">
        <div className="viewer-empty">
          {t('fileViewer.binaryNote', { size: file.size })}
        </div>
      </div>
    </div>
  );
}

function DocumentPreviewViewer({
  projectId,
  file,
}: {
  projectId: string;
  file: ProjectFile;
}) {
  const t = useT();
  const [preview, setPreview] = useState<ProjectFilePreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPreview(null);
    void fetchProjectFilePreview(projectId, file.name).then((next) => {
      if (!cancelled) {
        setPreview(next);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, file.name, file.mtime]);

  return (
    <div className="viewer document-viewer">
      <div className="viewer-toolbar">
        <div className="viewer-toolbar-left">
          <span className="viewer-meta">
            {documentMetaLabel(file, t)} · {humanSize(file.size)}
          </span>
        </div>
        <FileActions projectId={projectId} file={file} />
      </div>
      <div className="viewer-body">
        {loading ? (
          <div className="viewer-empty">{t('fileViewer.loading')}</div>
        ) : preview ? (
          <div className="document-preview">
            <h2>{preview.title}</h2>
            {preview.sections.map((section, idx) => (
              <section key={`${section.title}-${idx}`}>
                <h3>{section.title}</h3>
                {section.lines.map((line, lineIdx) => (
                  <p key={`${lineIdx}-${line}`}>{line}</p>
                ))}
              </section>
            ))}
          </div>
        ) : (
          <div className="viewer-empty">{t('fileViewer.previewUnavailable')}</div>
        )}
      </div>
    </div>
  );
}

function HtmlViewer({
  projectId,
  file,
  liveHtml,
  isDeck,
  onExportAsPptx,
  streaming,
}: {
  projectId: string;
  file: ProjectFile;
  liveHtml?: string;
  isDeck: boolean;
  onExportAsPptx?: ((fileName: string) => void) | undefined;
  streaming: boolean;
}) {
  const t = useT();
  const [mode, setMode] = useState<'preview' | 'source'>('preview');
  const [source, setSource] = useState<string | null>(liveHtml ?? null);
  const [zoom, setZoom] = useState(100);
  const [presentMenuOpen, setPresentMenuOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  // Template save UX. We surface a transient "Saved" pill in the share
  // menu so the user gets feedback without a noisy toast layer.
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateNote, setTemplateNote] = useState<string | null>(null);
  const [inTabPresent, setInTabPresent] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Slide deck nav state: the iframe posts the active index + total count
  // back to the host every time a slide settles. Host renders prev/next
  // controls in the toolbar and reflects the count beside them.
  const [slideState, setSlideState] = useState<{ active: number; count: number } | null>(null);
  const previewBodyRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const shareRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (liveHtml !== undefined) {
      setSource(liveHtml);
      return;
    }
    setSource(null);
    let cancelled = false;
    void fetchProjectFileText(projectId, file.name).then((text) => {
      if (!cancelled) setSource(text);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, file.name, file.mtime, liveHtml, reloadKey]);

  // Detect deck-shaped HTML even when the project's skill didn't declare
  // `mode: deck`. Freeform projects often produce a deck because the user
  // asked for one in plain prose; without this, prev/next and Present
  // never surface and the deck becomes a static, unnavigable preview.
  const looksLikeDeck = useMemo(() => {
    if (!source) return false;
    return /class\s*=\s*['"][^'"]*\bslide\b/i.test(source);
  }, [source]);
  const effectiveDeck = isDeck || looksLikeDeck;

  const srcDoc = useMemo(
    () => (source ? buildSrcdoc(source, {
      deck: effectiveDeck,
      baseHref: projectRawUrl(projectId, baseDirFor(file.name)),
    }) : ''),
    [source, effectiveDeck, projectId, file.name],
  );

  useEffect(() => {
    if (!effectiveDeck) {
      setSlideState(null);
      return;
    }
    function onMessage(ev: MessageEvent) {
      const data = ev?.data as
        | { type?: string; active?: number; count?: number }
        | null;
      if (!data || data.type !== 'od:slide-state') return;
      if (typeof data.active !== 'number' || typeof data.count !== 'number') return;
      setSlideState({ active: data.active, count: data.count });
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [effectiveDeck]);

  function postSlide(action: 'next' | 'prev' | 'first' | 'last') {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: 'od:slide', action }, '*');
  }

  // Keyboard nav on the host, so the user can press ←/→ even when focus
  // is on the chat composer or any other host control.
  useEffect(() => {
    if (!effectiveDeck || mode !== 'preview') return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        postSlide('next');
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        postSlide('prev');
      } else if (e.key === 'Home') {
        e.preventDefault();
        postSlide('first');
      } else if (e.key === 'End') {
        e.preventDefault();
        postSlide('last');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [effectiveDeck, mode]);

  useEffect(() => {
    if (!presentMenuOpen) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.present-wrap')) return;
      setPresentMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresentMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [presentMenuOpen]);

  useEffect(() => {
    if (!shareMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!shareRef.current) return;
      if (!shareRef.current.contains(e.target as Node)) setShareMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShareMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [shareMenuOpen]);

  useEffect(() => {
    if (!inTabPresent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInTabPresent(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [inTabPresent]);

  function openInNewTab() {
    if (!source) return;
    const blob = new Blob([source], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  // Snapshot this project as a reusable template. The daemon snapshots
  // EVERY html/text/code file in the project (not just the file open in
  // the viewer), so the template captures the whole design, not a single
  // page. Surfaced here in the Share menu because that's where the user's
  // share / export mental model already lives.
  async function handleSaveAsTemplate() {
    setShareMenuOpen(false);
    const defaultName =
      file.name.replace(/\.html?$/i, '') || t('fileViewer.templateNameDefault');
    const name = window.prompt(t('fileViewer.templateNamePrompt'), defaultName);
    if (!name || !name.trim()) return;
    const description = window.prompt(
      t('fileViewer.templateDescPrompt'),
      '',
    );
    setSavingTemplate(true);
    setTemplateNote(null);
    try {
      const tpl = await saveTemplate({
        name: name.trim(),
        description: description?.trim() || undefined,
        sourceProjectId: projectId,
      });
      setTemplateNote(
        tpl
          ? t('fileViewer.savedTemplate', { name: tpl.name })
          : t('fileViewer.savedTemplateFail'),
      );
    } finally {
      setSavingTemplate(false);
      // Auto-clear the note so the menu doesn't keep stale state next open.
      setTimeout(() => setTemplateNote(null), 4000);
    }
  }

  function presentInThisTab() {
    setPresentMenuOpen(false);
    setInTabPresent(true);
  }

  function presentFullscreen() {
    setPresentMenuOpen(false);
    const el = previewBodyRef.current;
    if (el && typeof el.requestFullscreen === 'function') {
      el.requestFullscreen().catch(() => setInTabPresent(true));
    } else {
      setInTabPresent(true);
    }
  }

  function presentNewTab() {
    setPresentMenuOpen(false);
    openInNewTab();
  }

  function bumpZoom(delta: number) {
    setZoom((z) => Math.max(25, Math.min(200, z + delta)));
  }

  const showPresent = effectiveDeck && source !== null;
  const canShare = source !== null;
  const exportTitle = file.name.replace(/\.html?$/i, '') || file.name;
  const canPptx = canShare && Boolean(onExportAsPptx) && !streaming;
  const previewScale = zoom / 100;

  return (
    <div className="viewer html-viewer">
      <div className="viewer-toolbar">
        <div className="viewer-toolbar-left">
          <button
            type="button"
            className="icon-only"
            onClick={() => setReloadKey((n) => n + 1)}
            title={t('fileViewer.reload')}
            aria-label={t('fileViewer.reloadAria')}
          >
            <Icon name="reload" size={14} />
          </button>
          {effectiveDeck ? (
            <span
              className="deck-nav"
              role="group"
              aria-label={t('fileViewer.slideNavAria')}
            >
              <button
                type="button"
                className="icon-only"
                onClick={() => postSlide('prev')}
                title={t('fileViewer.previousSlide')}
                aria-label={t('fileViewer.previousSlide')}
                disabled={slideState !== null && slideState.active <= 0}
              >
                <Icon name="chevron-right" size={14} style={{ transform: 'rotate(180deg)' }} />
              </button>
              <span className="deck-nav-counter">
                {slideState
                  ? `${slideState.active + 1} / ${slideState.count}`
                  : '— / —'}
              </span>
              <button
                type="button"
                className="icon-only"
                onClick={() => postSlide('next')}
                title={t('fileViewer.nextSlide')}
                aria-label={t('fileViewer.nextSlide')}
                disabled={
                  slideState !== null &&
                  slideState.active >= slideState.count - 1
                }
              >
                <Icon name="chevron-right" size={14} />
              </button>
            </span>
          ) : null}
          <button
            type="button"
            className="viewer-toggle"
            disabled
            data-coming-soon="true"
            title={t('fileViewer.tweaks')}
            aria-pressed={false}
            onClick={(e) => e.preventDefault()}
          >
            <Icon name="tweaks" size={13} />
            <span>{t('fileViewer.tweaks')}</span>
            <span className="switch" aria-hidden />
          </button>
        </div>
        <div className="viewer-toolbar-actions">
          <div className="viewer-tabs">
            <button
              className={`viewer-tab ${mode === 'preview' ? 'active' : ''}`}
              onClick={() => setMode('preview')}
            >
              {t('fileViewer.preview')}
            </button>
            <button
              className={`viewer-tab ${mode === 'source' ? 'active' : ''}`}
              onClick={() => setMode('source')}
            >
              {t('fileViewer.source')}
            </button>
          </div>
          <span className="viewer-divider" aria-hidden />
          <button
            className="viewer-action"
            type="button"
            disabled
            data-coming-soon="true"
            title={t('fileViewer.comment')}
          >
            <Icon name="comment" size={13} />
            <span>{t('fileViewer.comment')}</span>
          </button>
          <button
            className="viewer-action"
            type="button"
            disabled
            data-coming-soon="true"
            title={t('fileViewer.edit')}
          >
            <Icon name="edit" size={13} />
            <span>{t('fileViewer.edit')}</span>
          </button>
          <button
            className="viewer-action"
            type="button"
            disabled
            data-coming-soon="true"
            title={t('fileViewer.draw')}
          >
            <Icon name="draw" size={13} />
            <span>{t('fileViewer.draw')}</span>
          </button>
          <span className="viewer-divider" aria-hidden />
          <button
            type="button"
            className="icon-only"
            onClick={() => bumpZoom(-25)}
            title={t('fileViewer.zoomOut')}
            aria-label={t('fileViewer.zoomOut')}
          >
            <Icon name="minus" size={14} />
          </button>
          <button
            type="button"
            className="viewer-action"
            onClick={() => setZoom(100)}
            title={t('fileViewer.resetZoom')}
            style={{ minWidth: 60 }}
          >
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{zoom}%</span>
          </button>
          <button
            type="button"
            className="icon-only"
            onClick={() => bumpZoom(25)}
            title={t('fileViewer.zoomIn')}
            aria-label={t('fileViewer.zoomIn')}
          >
            <Icon name="plus" size={14} />
          </button>
          <span className="viewer-divider" aria-hidden />
          {showPresent ? (
            <div className="present-wrap">
              <button
                className="viewer-action present-trigger"
                aria-haspopup="menu"
                aria-expanded={presentMenuOpen}
                onClick={() => setPresentMenuOpen((v) => !v)}
              >
                <Icon name="present" size={13} />
                <span>{t('fileViewer.present')}</span>
                <Icon name="chevron-down" size={11} />
              </button>
              {presentMenuOpen ? (
                <div className="present-menu" role="menu">
                  <button role="menuitem" onClick={presentInThisTab}>
                    <span className="present-icon"><Icon name="eye" size={13} /></span>{' '}
                    {t('fileViewer.presentInTab')}
                  </button>
                  <button role="menuitem" onClick={presentFullscreen}>
                    <span className="present-icon"><Icon name="play" size={13} /></span>{' '}
                    {t('fileViewer.presentFullscreen')}
                  </button>
                  <button role="menuitem" onClick={presentNewTab}>
                    <span className="present-icon"><Icon name="share" size={13} /></span>{' '}
                    {t('fileViewer.presentNewTab')}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          {canShare ? (
            <div className="share-menu" ref={shareRef}>
              <button
                className="viewer-action primary"
                aria-haspopup="menu"
                aria-expanded={shareMenuOpen}
                onClick={() => setShareMenuOpen((v) => !v)}
              >
                <span>{t('fileViewer.shareLabel')}</span>
                <Icon name="chevron-down" size={11} />
              </button>
              {shareMenuOpen ? (
                <div className="share-menu-popover" role="menu">
                  <button
                    type="button"
                    className="share-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setShareMenuOpen(false);
                      exportAsPdf(source ?? '', exportTitle, { deck: effectiveDeck });
                    }}
                  >
                    <span className="share-menu-icon"><Icon name="file" size={14} /></span>
                    <span>
                      {effectiveDeck
                        ? t('fileViewer.exportPdfAllSlides')
                        : t('fileViewer.exportPdf')}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="share-menu-item"
                    role="menuitem"
                    disabled={!canPptx}
                    title={
                      onExportAsPptx
                        ? streaming
                          ? t('fileViewer.exportPptxBusy')
                          : t('fileViewer.exportPptxHint')
                        : t('fileViewer.exportPptxNa')
                    }
                    onClick={() => {
                      setShareMenuOpen(false);
                      if (onExportAsPptx) onExportAsPptx(file.name);
                    }}
                  >
                    <span className="share-menu-icon"><Icon name="present" size={14} /></span>
                    <span>{t('fileViewer.exportPptx') + '…'}</span>
                  </button>
                  <div className="share-menu-divider" />
                  <button
                    type="button"
                    className="share-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setShareMenuOpen(false);
                      exportAsZip(source ?? '', exportTitle);
                    }}
                  >
                    <span className="share-menu-icon"><Icon name="download" size={14} /></span>
                    <span>{t('fileViewer.exportZip')}</span>
                  </button>
                  <button
                    type="button"
                    className="share-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setShareMenuOpen(false);
                      exportAsHtml(source ?? '', exportTitle);
                    }}
                  >
                    <span className="share-menu-icon"><Icon name="file-code" size={14} /></span>
                    <span>{t('fileViewer.exportHtml')}</span>
                  </button>
                  <div className="share-menu-divider" />
                  <button
                    type="button"
                    className="share-menu-item"
                    role="menuitem"
                    disabled={savingTemplate}
                    onClick={() => {
                      void handleSaveAsTemplate();
                    }}
                  >
                    <span className="share-menu-icon"><Icon name="copy" size={14} /></span>
                    <span>
                      {savingTemplate
                        ? t('fileViewer.savingTemplate')
                        : templateNote
                          ? templateNote
                          : t('fileViewer.saveAsTemplate')}
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="viewer-body" ref={previewBodyRef}>
        {source === null ? (
          <div className="viewer-empty">{t('fileViewer.loading')}</div>
        ) : mode === 'preview' ? (
          <div
            style={{
              width: `${100 / previewScale}%`,
              height: `${100 / previewScale}%`,
              transform: `scale(${previewScale})`,
              transformOrigin: '0 0',
            }}
          >
            <iframe
              ref={iframeRef}
              data-testid="artifact-preview-frame"
              title={file.name}
              sandbox="allow-scripts"
              srcDoc={srcDoc}
            />
          </div>
        ) : (
          <pre className="viewer-source">{source}</pre>
        )}
      </div>
      {inTabPresent && source ? (
        <div
          className="present-overlay"
          role="dialog"
          aria-label={t('fileViewer.exitPresentation')}
        >
          <button
            className="present-exit"
            onClick={() => setInTabPresent(false)}
            aria-label={t('fileViewer.exitPresentation')}
          >
            <Icon name="close" size={13} /> {t('fileViewer.exitPresentation')}
          </button>
          <iframe title="present" sandbox="allow-scripts" srcDoc={srcDoc} />
        </div>
      ) : null}
    </div>
  );
}

function baseDirFor(fileName: string): string {
  const idx = fileName.lastIndexOf('/');
  return idx >= 0 ? fileName.slice(0, idx + 1) : '';
}

function ImageViewer({
  projectId,
  file,
}: {
  projectId: string;
  file: ProjectFile;
}) {
  const t = useT();
  const url = `${projectFileUrl(projectId, file.name)}?v=${Math.round(file.mtime)}`;
  return (
    <div className="viewer image-viewer">
      <div className="viewer-toolbar">
        <div className="viewer-toolbar-left">
          <span className="viewer-meta">
            {file.kind === 'sketch'
              ? t('fileViewer.sketchMeta', { size: humanSize(file.size) })
              : t('fileViewer.imageMeta', { size: humanSize(file.size) })}
          </span>
        </div>
        <div className="viewer-toolbar-actions">
          <a
            className="ghost-link"
            href={projectFileUrl(projectId, file.name)}
            download={file.name}
          >
            {t('fileViewer.download')}
          </a>
          <a
            className="ghost-link"
            href={projectFileUrl(projectId, file.name)}
            target="_blank"
            rel="noreferrer noopener"
          >
            {t('fileViewer.open')}
          </a>
        </div>
      </div>
      <div className="viewer-body image-body">
        <img alt={file.name} src={url} />
      </div>
    </div>
  );
}

function TextViewer({
  projectId,
  file,
}: {
  projectId: string;
  file: ProjectFile;
}) {
  const t = useT();
  const [text, setText] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setText(null);
    let cancelled = false;
    void fetchProjectFileText(projectId, file.name).then((t) => {
      if (!cancelled) setText(t ?? '');
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, file.name, file.mtime, reloadKey]);

  async function copy() {
    if (text == null) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // best-effort fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  const lineCount = text ? text.split('\n').length : 0;

  return (
    <div className="viewer text-viewer">
      <div className="viewer-toolbar">
        <div className="viewer-toolbar-left" />
        <div className="viewer-toolbar-actions">
          <button
            type="button"
            className="viewer-action"
            onClick={() => setReloadKey((n) => n + 1)}
            title={t('fileViewer.reloadDisk')}
          >
            <Icon name="reload" size={13} />
            <span>{t('fileViewer.reload')}</span>
          </button>
          <button
            type="button"
            className="viewer-action"
            disabled
            title={t('fileViewer.saveDisabled')}
          >
            <Icon name="check" size={13} />
            <span>{t('fileViewer.save')}</span>
          </button>
          <button
            type="button"
            className="viewer-action"
            onClick={() => void copy()}
            title={t('fileViewer.copyTitle')}
          >
            <Icon name={copied ? 'check' : 'copy'} size={13} />
            <span>{copied ? t('fileViewer.copied') : t('fileViewer.copy')}</span>
          </button>
        </div>
      </div>
      <div className="viewer-body">
        {text === null ? (
          <div className="viewer-empty">{t('fileViewer.loading')}</div>
        ) : lineCount > 0 ? (
          <CodeWithLines text={text} />
        ) : (
          <pre className="viewer-source">{text}</pre>
        )}
      </div>
    </div>
  );
}

function CodeWithLines({ text }: { text: string }) {
  const lines = text.split('\n');
  // Trailing newline produces a phantom empty line — keep gutter aligned.
  const gutter = lines.map((_, i) => `${i + 1}`).join('\n');
  return (
    <pre className="code-viewer">
      <code className="gutter" aria-hidden>
        {gutter}
      </code>
      <code className="lines">{text}</code>
    </pre>
  );
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function documentMetaLabel(file: ProjectFile, t: TranslateFn): string {
  if (file.kind === 'pdf') return t('fileViewer.pdfMeta');
  if (file.kind === 'document') return t('fileViewer.documentMeta');
  if (file.kind === 'presentation') return t('fileViewer.presentationMeta');
  if (file.kind === 'spreadsheet') return t('fileViewer.spreadsheetMeta');
  return t('fileViewer.binaryMeta', { size: humanSize(file.size) });
}
