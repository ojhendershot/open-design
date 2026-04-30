import { useEffect, useMemo, useState } from 'react';
import { useT } from '../i18n';
import { fetchLiveArtifacts } from '../providers/registry';
import type { DesignSystemSummary, LiveArtifactSummary, Project, SkillSummary } from '../types';
import { Icon } from './Icon';

type SubTab = 'recent' | 'yours';

type DesignListItem =
  | { type: 'project'; project: Project; updatedAt: number }
  | { type: 'live-artifact'; project: Project; liveArtifact: LiveArtifactSummary; updatedAt: number };

interface Props {
  projects: Project[];
  skills: SkillSummary[];
  designSystems: DesignSystemSummary[];
  onOpen: (id: string) => void;
  onOpenLiveArtifact: (projectId: string, artifactId: string) => void;
  onDelete: (id: string) => void;
}

export function DesignsTab({
  projects,
  skills,
  designSystems,
  onOpen,
  onOpenLiveArtifact,
  onDelete,
}: Props) {
  const t = useT();
  const [filter, setFilter] = useState('');
  const [sub, setSub] = useState<SubTab>('recent');
  const [liveArtifactsByProject, setLiveArtifactsByProject] = useState<Record<string, LiveArtifactSummary[]>>({});

  useEffect(() => {
    let cancelled = false;
    const projectIds = projects.map((project) => project.id);
    if (projectIds.length === 0) {
      setLiveArtifactsByProject({});
      return;
    }

    void Promise.all(
      projectIds.map(async (projectId) => [projectId, await fetchLiveArtifacts(projectId)] as const),
    ).then((entries) => {
      if (cancelled) return;
      setLiveArtifactsByProject(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
  }, [projects]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let list: DesignListItem[] = projects.map((project) => ({
      type: 'project' as const,
      project,
      updatedAt: project.updatedAt,
    }));
    const liveItems = projects.flatMap((project) =>
      (liveArtifactsByProject[project.id] ?? []).map((liveArtifact) => ({
        type: 'live-artifact' as const,
        project,
        liveArtifact,
        updatedAt: Date.parse(liveArtifact.updatedAt) || project.updatedAt,
      })),
    );
    list = [...list, ...liveItems];
    if (sub === 'recent') {
      list = [...list].sort((a, b) => b.updatedAt - a.updatedAt);
    }
    if (!q) return list;
    return list.filter((item) => {
      if (item.project.name.toLowerCase().includes(q)) return true;
      return item.type === 'live-artifact' && item.liveArtifact.title.toLowerCase().includes(q);
    });
  }, [projects, liveArtifactsByProject, filter, sub]);

  const skillName = (id: string | null) => skills.find((s) => s.id === id)?.name ?? '';
  const dsName = (id: string | null) => designSystems.find((d) => d.id === id)?.title ?? '';

  return (
    <div className="tab-panel">
      <div className="tab-panel-toolbar">
        <div className="toolbar-left">
          <div
            className="subtab-pill"
            role="tablist"
            aria-label={t('designs.filterAria')}
          >
            <button
              role="tab"
              aria-selected={sub === 'recent'}
              className={sub === 'recent' ? 'active' : ''}
              onClick={() => setSub('recent')}
            >
              {t('designs.subRecent')}
            </button>
            <button
              role="tab"
              aria-selected={sub === 'yours'}
              className={sub === 'yours' ? 'active' : ''}
              onClick={() => setSub('yours')}
            >
              {t('designs.subYours')}
            </button>
          </div>
        </div>
        <div className="toolbar-search">
          <span className="search-icon" aria-hidden>
            <Icon name="search" size={13} />
          </span>
          <input
            placeholder={t('designs.searchPlaceholder')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="tab-empty">
          {projects.length === 0
            ? t('designs.emptyNoProjects')
            : t('designs.emptyNoMatch')}
        </div>
      ) : (
        <div className="design-grid">
          {filtered.map((item) => {
            const p = item.project;
            const skill = skillName(p.skillId);
            const ds = dsName(p.designSystemId);
            if (item.type === 'live-artifact') {
              const artifact = item.liveArtifact;
              const refreshable = artifact.refreshStatus !== 'never';
              return (
                <div
                  key={`live:${artifact.id}`}
                  className={`design-card live-artifact-card status-${artifact.status} refresh-${artifact.refreshStatus}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenLiveArtifact(p.id, artifact.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onOpenLiveArtifact(p.id, artifact.id);
                  }}
                >
                  <div className="design-card-thumb live-artifact-thumb" aria-hidden>
                    <span className="live-artifact-thumb-glyph">●</span>
                  </div>
                  <div className="design-card-meta-block">
                    <div className="design-card-badges" aria-label={t('designs.liveArtifactBadgesAria')}>
                      <span className="design-badge live">{t('designs.badgeLive')}</span>
                      {refreshable ? <span className="design-badge refreshable">{t('designs.badgeRefreshable')}</span> : null}
                    </div>
                    <div className="design-card-name" title={artifact.title}>{artifact.title}</div>
                    <div className="design-card-meta">
                      <span className="ds">{p.name}</span>
                      {' · '}
                      {artifactStatusLabel(artifact.status, artifact.refreshStatus, t)}
                      {' · '}
                      {relativeTime(item.updatedAt, t)}
                    </div>
                  </div>
                </div>
              );
            }
            const liveCount = liveArtifactsByProject[p.id]?.length ?? 0;
            return (
              <div
                key={p.id}
                className="design-card"
                role="button"
                tabIndex={0}
                onClick={() => onOpen(p.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onOpen(p.id);
                }}
              >
                <button
                  className="design-card-close"
                  title={t('designs.deleteTitle')}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(t('designs.deleteConfirm', { name: p.name }))) {
                      onDelete(p.id);
                    }
                  }}
                >
                  ×
                </button>
                <div className="design-card-thumb" aria-hidden>
                  {liveCount > 0 ? (
                    <span className="design-live-count">{t('designs.liveCount', { n: liveCount })}</span>
                  ) : null}
                </div>
                <div className="design-card-meta-block">
                  <div className="design-card-name" title={p.name}>{p.name}</div>
                  <div className="design-card-meta">
                    {ds ? (
                      <span className="ds">{ds}</span>
                    ) : (
                      <span>{t('designs.cardFreeform')}</span>
                    )}
                    {skill ? ` · ${skill}` : ''}
                    {' · '}
                    {relativeTime(p.updatedAt, t)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function relativeTime(ts: number, t: ReturnType<typeof useT>): string {
  const diff = Date.now() - ts;
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return t('common.justNow');
  if (diff < hr) return t('common.minutesAgo', { n: Math.floor(diff / min) });
  if (diff < day) return t('common.hoursAgo', { n: Math.floor(diff / hr) });
  if (diff < 7 * day) return t('common.daysAgo', { n: Math.floor(diff / day) });
  return new Date(ts).toLocaleDateString();
}

function artifactStatusLabel(
  status: LiveArtifactSummary['status'],
  refreshStatus: LiveArtifactSummary['refreshStatus'],
  t: ReturnType<typeof useT>,
): string {
  if (status === 'archived') return t('designs.statusArchived');
  if (status === 'error') return t('designs.statusError');
  if (refreshStatus === 'running') return t('designs.statusRefreshing');
  if (refreshStatus === 'failed') return t('designs.statusRefreshFailed');
  if (refreshStatus === 'succeeded') return t('designs.statusRefreshed');
  return t('designs.statusLive');
}
