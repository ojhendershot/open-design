import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useT } from '../i18n';
import { Icon } from './Icon';
import type { AppConfig } from '../types';
import type { SkillSummary } from '@open-design/contracts';
import {
  deleteSkill,
  fetchSkill,
  fetchSkillFiles,
  fetchSkills,
  importSkill,
  updateSkill,
  type SkillFileEntry,
} from '../providers/registry';

// Functional skills only — design templates render in EntryView's
// Templates tab and are managed under their own daemon registry. See
// specs/current/skills-and-design-templates.md.
//
// The section is laid out as a two-column workspace:
// - Left:  searchable list of skills + filters + "New" entry point
// - Right: detail panel that doubles as previewer (read mode), editor
//          (when the user clicks Edit on a skill), or new-skill draft
//          (when the user clicks "New skill" in the toolbar).
// Replacing the previous tab-with-design-systems layout matters because
// design-systems are now a sibling Settings section; mixing them here
// produced a long, sub-tab-gated dialog that hid both surfaces from
// each other.

interface Props {
  cfg: AppConfig;
  setCfg: Dispatch<SetStateAction<AppConfig>>;
}

type SourceFilter = 'all' | 'user' | 'built-in';

type DetailMode =
  // Showing the SKILL.md body for the skill currently selected in the list.
  | { kind: 'view'; id: string }
  // Editing an existing skill — pre-fills the form with the current body.
  | { kind: 'edit'; id: string }
  // Drafting a brand new skill — empty form, writes to USER_SKILLS_DIR.
  | { kind: 'create' }
  // No skill selected and no draft in flight — shows an empty placeholder.
  | { kind: 'idle' };

interface DraftState {
  name: string;
  description: string;
  triggers: string;
  body: string;
}

const EMPTY_DRAFT: DraftState = {
  name: '',
  description: '',
  triggers: '',
  body: '',
};

function summaryToDraft(skill: SkillSummary, body: string): DraftState {
  return {
    name: skill.name,
    description: skill.description,
    triggers: Array.isArray(skill.triggers) ? skill.triggers.join(', ') : '',
    body,
  };
}

function parseTriggers(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function SkillsSection({ cfg, setCfg }: Props) {
  const t = useT();

  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<DetailMode>({ kind: 'idle' });

  // Body for the currently-selected skill — fetched lazily so the list
  // payload stays small. `null` means "not yet fetched"; `''` means
  // "fetched but empty".
  const [bodyById, setBodyById] = useState<Record<string, string>>({});
  const [bodyLoadingId, setBodyLoadingId] = useState<string | null>(null);

  // File tree for the currently-selected skill. Cached the same way as
  // bodies so opening / re-opening the same skill is instant after the
  // first fetch.
  const [filesById, setFilesById] = useState<Record<string, SkillFileEntry[]>>({});
  const [filesLoadingId, setFilesLoadingId] = useState<string | null>(null);

  // Editing draft + status. The draft is held in local state so the user
  // can switch away and come back without losing progress (we drop it
  // only on Save / Cancel).
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);

  // Inline delete confirmation — replaces the old window.confirm() call.
  // Only one skill can be in the "confirm pending" state at a time; the
  // user clicks once to arm, twice to commit.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const list = await fetchSkills();
    setSkills(list);
    return list;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const disabledSkills = useMemo(
    () => new Set(cfg.disabledSkills ?? []),
    [cfg.disabledSkills],
  );

  const modeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of skills) {
      counts.set(s.mode, (counts.get(s.mode) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [skills]);

  const filteredSkills = useMemo(() => {
    const q = search.toLowerCase().trim();
    return skills.filter((s) => {
      if (modeFilter !== 'all' && s.mode !== modeFilter) return false;
      if (sourceFilter !== 'all' && s.source !== sourceFilter) return false;
      if (!q) return true;
      const hay = `${s.name}\n${s.description}\n${(s.triggers ?? []).join(' ')}`;
      return hay.toLowerCase().includes(q);
    });
  }, [skills, modeFilter, sourceFilter, search]);

  const selectedSkill = useMemo(
    () => skills.find((s) => s.id === selectedId) ?? null,
    [skills, selectedId],
  );

  const ensureBody = useCallback(
    async (id: string) => {
      if (bodyById[id] !== undefined) return bodyById[id];
      setBodyLoadingId(id);
      try {
        const detail = await fetchSkill(id);
        const body = detail?.body ?? '';
        setBodyById((cur) => ({ ...cur, [id]: body }));
        return body;
      } finally {
        setBodyLoadingId((cur) => (cur === id ? null : cur));
      }
    },
    [bodyById],
  );

  const ensureFiles = useCallback(
    async (id: string) => {
      if (filesById[id]) return filesById[id]!;
      setFilesLoadingId(id);
      try {
        const files = await fetchSkillFiles(id);
        setFilesById((cur) => ({ ...cur, [id]: files }));
        return files;
      } finally {
        setFilesLoadingId((cur) => (cur === id ? null : cur));
      }
    },
    [filesById],
  );

  const selectSkill = useCallback(
    (id: string) => {
      setSelectedId(id);
      setDetailMode({ kind: 'view', id });
      setConfirmDeleteId(null);
      void ensureBody(id);
      void ensureFiles(id);
    },
    [ensureBody, ensureFiles],
  );

  const startCreate = useCallback(() => {
    setSelectedId(null);
    setDraft(EMPTY_DRAFT);
    setDraftError(null);
    setDetailMode({ kind: 'create' });
    setConfirmDeleteId(null);
  }, []);

  const startEdit = useCallback(
    async (skill: SkillSummary) => {
      const body = await ensureBody(skill.id);
      setDraft(summaryToDraft(skill, body ?? ''));
      setDraftError(null);
      setDetailMode({ kind: 'edit', id: skill.id });
      setConfirmDeleteId(null);
    },
    [ensureBody],
  );

  const cancelDraft = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    setDraftError(null);
    if (selectedId) {
      setDetailMode({ kind: 'view', id: selectedId });
    } else {
      setDetailMode({ kind: 'idle' });
    }
  }, [selectedId]);

  const submitDraft = useCallback(async () => {
    if (draftSaving) return;
    const name = draft.name.trim();
    const body = draft.body.trim();
    if (!name) {
      setDraftError('Skill name is required.');
      return;
    }
    if (!body) {
      setDraftError('Skill body is required.');
      return;
    }
    const triggers = parseTriggers(draft.triggers);
    const payload = {
      name,
      description: draft.description.trim() || undefined,
      body,
      triggers,
    };
    setDraftSaving(true);
    setDraftError(null);
    const result =
      detailMode.kind === 'edit'
        ? await updateSkill(detailMode.id, payload)
        : await importSkill(payload);
    setDraftSaving(false);
    if ('error' in result) {
      setDraftError(result.error.message);
      return;
    }
    const updated = result.skill;
    await refresh();
    setBodyById((cur) => ({ ...cur, [updated.id]: body }));
    // Drop the cached file tree for this id so the next selection
    // re-walks the on-disk folder; SKILL.md may have been the only
    // file there before, but the user might have meant to add more.
    setFilesById((cur) => {
      const next = { ...cur };
      delete next[updated.id];
      return next;
    });
    setSelectedId(updated.id);
    setDetailMode({ kind: 'view', id: updated.id });
    setDraft(EMPTY_DRAFT);
  }, [detailMode, draft, draftSaving, refresh]);

  const armDelete = useCallback((id: string) => {
    setConfirmDeleteId(id);
  }, []);

  const cancelDelete = useCallback(() => {
    setConfirmDeleteId(null);
  }, []);

  const commitDelete = useCallback(
    async (id: string) => {
      const result = await deleteSkill(id);
      if ('error' in result) {
        setDraftError(result.error.message);
        return;
      }
      setConfirmDeleteId(null);
      await refresh();
      setBodyById((cur) => {
        const next = { ...cur };
        delete next[id];
        return next;
      });
      setFilesById((cur) => {
        const next = { ...cur };
        delete next[id];
        return next;
      });
      // Clear the disabled-skill flag so deleting a skill that was
      // toggled off doesn't leave dangling preferences behind.
      setCfg((c) => {
        const set = new Set(c.disabledSkills ?? []);
        set.delete(id);
        return { ...c, disabledSkills: [...set] };
      });
      if (selectedId === id) {
        setSelectedId(null);
        setDetailMode({ kind: 'idle' });
      }
    },
    [refresh, selectedId, setCfg],
  );

  const toggleEnabled = useCallback(
    (id: string, enabled: boolean) => {
      setCfg((c) => {
        const set = new Set(c.disabledSkills ?? []);
        if (enabled) set.delete(id);
        else set.add(id);
        return { ...c, disabledSkills: [...set] };
      });
    },
    [setCfg],
  );

  const draftHeading =
    detailMode.kind === 'edit'
      ? `Editing ${detailMode.id}`
      : detailMode.kind === 'create'
        ? 'New skill'
        : '';

  return (
    <section className="settings-section settings-skills">
      <div className="section-head">
        <div>
          <h3>{t('settings.skills')}</h3>
          <p className="hint">{t('settings.skillsHint')}</p>
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={startCreate}
          data-testid="skills-new"
        >
          <Icon name="plus" size={14} />
          <span>{t('settings.skillsNew')}</span>
        </button>
      </div>

      <div className="library-toolbar">
        <input
          type="search"
          className="library-search"
          placeholder={t('settings.librarySearch')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="library-filters">
          {(['all', 'user', 'built-in'] as const).map((s) => {
            const count =
              s === 'all'
                ? skills.length
                : skills.filter((skill) => skill.source === s).length;
            return (
              <button
                key={s}
                type="button"
                className={`filter-pill${sourceFilter === s ? ' active' : ''}`}
                onClick={() => setSourceFilter(s)}
              >
                {s === 'all' ? t('settings.libraryAll') : s}
                <span className="filter-pill-count">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="library-filters">
          <button
            type="button"
            className={`filter-pill${modeFilter === 'all' ? ' active' : ''}`}
            onClick={() => setModeFilter('all')}
          >
            {t('settings.libraryAll')}
          </button>
          {modeOptions.map(([mode, count]) => (
            <button
              key={mode}
              type="button"
              className={`filter-pill${modeFilter === mode ? ' active' : ''}`}
              onClick={() => setModeFilter(mode)}
            >
              {mode}
              <span className="filter-pill-count">{count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="skills-layout">
        <div className="skills-list" data-testid="skills-list">
          {filteredSkills.length === 0 ? (
            <p className="library-empty">{t('settings.libraryNoResults')}</p>
          ) : (
            filteredSkills.map((skill) => {
              const enabled = !disabledSkills.has(skill.id);
              const isSelected = selectedId === skill.id;
              return (
                <div
                  key={skill.id}
                  className={`library-card${enabled ? '' : ' disabled'}${
                    isSelected ? ' is-selected' : ''
                  }`}
                  data-testid={`skill-row-${skill.id}`}
                >
                  <button
                    type="button"
                    className="library-card-info skills-card-button"
                    onClick={() => selectSkill(skill.id)}
                  >
                    <div className="library-card-title-row">
                      <span className="library-card-name">{skill.name}</span>
                      <span className="library-card-badge">{skill.mode}</span>
                      {skill.source === 'user' ? (
                        <span
                          className="library-card-badge library-card-badge-user"
                          title="User-imported skill"
                        >
                          user
                        </span>
                      ) : null}
                    </div>
                    <div className="library-card-desc">{skill.description}</div>
                  </button>
                  <label
                    className="toggle-switch"
                    title={t('settings.libraryToggleLabel')}
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) =>
                        toggleEnabled(skill.id, e.target.checked)
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              );
            })
          )}
        </div>

        <div className="skills-detail" data-testid="skills-detail">
          {detailMode.kind === 'idle' ? (
            <div className="skills-detail-empty">
              <Icon name="grid" size={28} />
              <p>{t('settings.skillsEmpty')}</p>
            </div>
          ) : null}

          {detailMode.kind === 'view' && selectedSkill ? (
            <SkillDetailView
              skill={selectedSkill}
              body={bodyById[selectedSkill.id]}
              bodyLoading={bodyLoadingId === selectedSkill.id}
              files={filesById[selectedSkill.id] ?? null}
              filesLoading={filesLoadingId === selectedSkill.id}
              confirmDelete={confirmDeleteId === selectedSkill.id}
              onEdit={() => void startEdit(selectedSkill)}
              onArmDelete={() => armDelete(selectedSkill.id)}
              onCancelDelete={cancelDelete}
              onCommitDelete={() => void commitDelete(selectedSkill.id)}
            />
          ) : null}

          {detailMode.kind === 'create' || detailMode.kind === 'edit' ? (
            <SkillDraftForm
              heading={draftHeading}
              draft={draft}
              setDraft={setDraft}
              error={draftError}
              saving={draftSaving}
              isEdit={detailMode.kind === 'edit'}
              onCancel={cancelDraft}
              onSubmit={() => void submitDraft()}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

interface SkillDetailViewProps {
  skill: SkillSummary;
  body: string | undefined;
  bodyLoading: boolean;
  files: SkillFileEntry[] | null;
  filesLoading: boolean;
  confirmDelete: boolean;
  onEdit: () => void;
  onArmDelete: () => void;
  onCancelDelete: () => void;
  onCommitDelete: () => void;
}

function SkillDetailView({
  skill,
  body,
  bodyLoading,
  files,
  filesLoading,
  confirmDelete,
  onEdit,
  onArmDelete,
  onCancelDelete,
  onCommitDelete,
}: SkillDetailViewProps) {
  const t = useT();
  return (
    <div className="skills-detail-view">
      <header className="skills-detail-head">
        <div>
          <h4>{skill.name}</h4>
          <p className="skills-detail-meta">
            {skill.mode}
            {skill.source === 'user' ? ' · user' : ' · built-in'}
            {skill.description ? ` · ${skill.description}` : ''}
          </p>
        </div>
        <div className="skills-detail-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={onEdit}
            data-testid="skills-edit"
          >
            <Icon name="edit" size={12} />
            <span>{t('settings.skillsEdit')}</span>
          </button>
          {confirmDelete ? (
            <span className="skills-delete-confirm" role="group">
              <button
                type="button"
                className="btn danger"
                onClick={onCommitDelete}
                data-testid="skills-delete-confirm"
              >
                {t('settings.skillsDeleteConfirm')}
              </button>
              <button type="button" className="btn ghost" onClick={onCancelDelete}>
                {t('common.cancel')}
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="btn ghost"
              onClick={onArmDelete}
              data-testid="skills-delete"
            >
              <Icon name="close" size={12} />
              <span>{t('settings.skillsDelete')}</span>
            </button>
          )}
        </div>
      </header>

      <div className="skills-detail-grid">
        <div className="skills-detail-body">
          <h5>SKILL.md</h5>
          {bodyLoading ? (
            <p className="library-empty">{t('settings.libraryLoading')}</p>
          ) : (
            <pre className="library-preview-body">{body ?? ''}</pre>
          )}
        </div>
        <div className="skills-detail-files">
          <h5>{t('settings.skillsFiles')}</h5>
          {filesLoading ? (
            <p className="library-empty">{t('settings.libraryLoading')}</p>
          ) : !files || files.length === 0 ? (
            <p className="library-empty">{t('settings.skillsNoFiles')}</p>
          ) : (
            <ul className="skills-file-tree">
              {files.map((entry) => (
                <li
                  key={entry.path}
                  className={`skills-file-entry skills-file-entry-${entry.kind}`}
                  style={{ paddingLeft: depthIndent(entry.path) }}
                >
                  <Icon
                    name={entry.kind === 'directory' ? 'folder' : 'file'}
                    size={12}
                  />
                  <span>{leafName(entry.path)}</span>
                  {entry.kind === 'file' && typeof entry.size === 'number' ? (
                    <span className="skills-file-size">
                      {formatSize(entry.size)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

interface SkillDraftFormProps {
  heading: string;
  draft: DraftState;
  setDraft: Dispatch<SetStateAction<DraftState>>;
  error: string | null;
  saving: boolean;
  isEdit: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

function SkillDraftForm({
  heading,
  draft,
  setDraft,
  error,
  saving,
  isEdit,
  onCancel,
  onSubmit,
}: SkillDraftFormProps) {
  const t = useT();
  return (
    <div
      className="skills-detail-draft library-import-form"
      data-testid={isEdit ? 'skills-edit-form' : 'skills-create-form'}
    >
      <header className="skills-draft-head">
        <h4>{heading}</h4>
      </header>
      <div className="library-import-row">
        <label>
          <span>{t('settings.skillsName')}</span>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="my-skill"
            disabled={isEdit}
          />
        </label>
        <label>
          <span>{t('settings.skillsTriggers')}</span>
          <input
            type="text"
            value={draft.triggers}
            onChange={(e) =>
              setDraft((d) => ({ ...d, triggers: e.target.value }))
            }
            placeholder="search the web, summarize"
          />
        </label>
      </div>
      <label className="library-import-block">
        <span>{t('settings.skillsDescription')}</span>
        <textarea
          rows={2}
          value={draft.description}
          onChange={(e) =>
            setDraft((d) => ({ ...d, description: e.target.value }))
          }
          placeholder="What does this skill do? When should the agent reach for it?"
        />
      </label>
      <label className="library-import-block">
        <span>{t('settings.skillsBody')}</span>
        <textarea
          rows={14}
          value={draft.body}
          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          placeholder={'# My skill\n\n1. Explain the workflow.\n2. Describe the inputs and outputs.'}
        />
      </label>
      {error ? (
        <div className="library-import-error" role="alert">
          {error}
        </div>
      ) : null}
      <div className="library-import-actions">
        <button
          type="button"
          className="btn ghost"
          onClick={onCancel}
          disabled={saving}
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={onSubmit}
          disabled={saving}
          data-testid="skills-save"
        >
          {saving
            ? t('settings.skillsSaving')
            : isEdit
              ? t('settings.skillsSave')
              : t('settings.skillsCreate')}
        </button>
      </div>
    </div>
  );
}

// Each `/`-separated segment indents by 12px so a small assets/ tree
// reads as a tree without us building a nested list. Capped at 4 levels
// so bundles with deep folder hierarchies don't push the file label
// past the panel.
function depthIndent(p: string): number {
  const depth = Math.min(4, p.split('/').length - 1);
  return depth * 12;
}

function leafName(p: string): string {
  const idx = p.lastIndexOf('/');
  return idx >= 0 ? p.slice(idx + 1) : p;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
