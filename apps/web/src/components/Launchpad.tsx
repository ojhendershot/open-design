// Launchpad — demo IA shell. Replaces the multi-tab EntryView with a
// single, input-first home page modeled on v0/bolt/lovable. Behind a URL
// flag (?ia=legacy falls back to EntryView). Pet rail / sidebar form /
// top tabs / footer pills are all intentionally absent here — see
// branch demo/launchpad-ia for the full IA proposal context.

import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  ChangeEvent as ReactChangeEvent,
  ClipboardEvent as ReactClipboardEvent,
  DragEvent as ReactDragEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useT } from '../i18n';
import type { Dict } from '../i18n/types';
import { AppChromeHeader } from './AppChromeHeader';
import { Icon } from './Icon';
import { CenteredLoader } from './Loading';
import type { CreateInput } from './NewProjectPanel';
import { DEFAULT_IMAGE_MODEL, DEFAULT_VIDEO_MODEL } from '../media/models';
import type {
  AppConfig,
  Project,
  ProjectDisplayStatus,
  ProjectMetadata,
  SkillSummary,
} from '../types';

// IA v1.5 — capability/form split with 7 ProjectKind-aligned tabs.
//
// Capability (modality) lives ABOVE the chat as a tab strip — what kind
// of artifact am I building? Each tab maps directly to a ProjectKind so
// taxonomy on the homepage matches what the file system / contracts
// already encode. Product form lives BELOW the chat in a collapsible
// Settings panel — what shape exactly? Prototype's form factor (Mobile
// / Web / Landing), Image's aspect, Video's length, etc.
//
// One capability is always selected (defaults to Prototype). Tabs are
// select-only, they don't auto-launch — Create is the single submit
// path.

type CapabilityId =
  | 'prototype'
  | 'artifact'
  | 'deck'
  | 'template'
  | 'image'
  | 'video'
  | 'audio';

type PrototypeFormFactor = 'mobile' | 'web' | 'landing';
type Fidelity = 'wireframe' | 'hi-fi';

interface FormState {
  prototype: { factor: PrototypeFormFactor; fidelity: Fidelity };
}

const DEFAULT_FORM: FormState = {
  prototype: { factor: 'mobile', fidelity: 'hi-fi' },
};

interface CapabilityDef {
  id: CapabilityId;
  glyph: string;
  labelKey: keyof Dict;
}

const CAPABILITIES: CapabilityDef[] = [
  { id: 'prototype', glyph: '🎨', labelKey: 'launchpad.capPrototype' },
  { id: 'artifact', glyph: '⚡', labelKey: 'launchpad.capArtifact' },
  { id: 'deck', glyph: '📊', labelKey: 'launchpad.capDeck' },
  { id: 'template', glyph: '📦', labelKey: 'launchpad.capTemplate' },
  { id: 'image', glyph: '🖼', labelKey: 'launchpad.capImage' },
  { id: 'video', glyph: '🎬', labelKey: 'launchpad.capVideo' },
  { id: 'audio', glyph: '🎵', labelKey: 'launchpad.capAudio' },
];

const PROTOTYPE_FORM_FACTORS: Array<{
  id: PrototypeFormFactor;
  labelKey: keyof Dict;
  starterKey: keyof Dict;
}> = [
  { id: 'mobile', labelKey: 'launchpad.formFactorMobile', starterKey: 'launchpad.tileStarterMobile' },
  { id: 'web', labelKey: 'launchpad.formFactorWeb', starterKey: 'launchpad.tileStarterWeb' },
  { id: 'landing', labelKey: 'launchpad.formFactorLanding', starterKey: 'launchpad.tileStarterLanding' },
];

const FIDELITIES: Array<{ id: Fidelity; labelKey: keyof Dict }> = [
  { id: 'hi-fi', labelKey: 'launchpad.fidelityHiFi' },
  { id: 'wireframe', labelKey: 'launchpad.fidelityWireframe' },
];

// Build the ProjectMetadata that NewProjectPanel would have produced for
// the current capability + form selection. The Artifact capability is
// modeled as a prototype with the live-artifact intent flag — its
// metadata kind is still 'prototype', matching how OD's contracts
// already represent live data dashboards.
function buildMetadata(capability: CapabilityId, form: FormState): ProjectMetadata {
  switch (capability) {
    case 'prototype': {
      const fidelity: 'wireframe' | 'high-fidelity' =
        form.prototype.fidelity === 'wireframe' ? 'wireframe' : 'high-fidelity';
      return { kind: 'prototype', fidelity };
    }
    case 'artifact':
      return { kind: 'prototype', intent: 'live-artifact', fidelity: 'high-fidelity' };
    case 'deck':
      return { kind: 'deck', speakerNotes: false };
    case 'template':
      return { kind: 'template' };
    case 'image':
      return { kind: 'image', imageModel: DEFAULT_IMAGE_MODEL, imageAspect: '1:1' };
    case 'video':
      return {
        kind: 'video',
        videoModel: DEFAULT_VIDEO_MODEL,
        videoAspect: '16:9',
        videoLength: 5,
      };
    case 'audio':
      return { kind: 'audio', audioKind: 'music', audioDuration: 10 };
  }
}

// Pick the starter prompt key for the active capability + form.
// Prototype varies by form factor so the agent gets a prompt matching
// the intended shape (mobile vs web vs landing); other capabilities
// have a single starter today.
function starterKeyFor(capability: CapabilityId, form: FormState): keyof Dict {
  switch (capability) {
    case 'prototype': {
      const factor = PROTOTYPE_FORM_FACTORS.find((f) => f.id === form.prototype.factor);
      return factor?.starterKey ?? 'launchpad.tileStarterMobile';
    }
    case 'artifact':
      return 'launchpad.tileStarterArtifact';
    case 'deck':
      return 'launchpad.tileStarterDeck';
    case 'template':
      return 'launchpad.tileStarterTemplate';
    case 'image':
      return 'launchpad.tileStarterImage';
    case 'video':
      return 'launchpad.tileStarterVideo';
    case 'audio':
      return 'launchpad.tileStarterAudio';
  }
}

// MIME accept list for the composer's file picker (and paste/drop
// handlers). Builders may bring sketches (raster images), competitor
// screenshots, scanned wireframes (PDF), reference clips for video, or
// audio stems — keep the list permissive per capability today; backend
// processing pipelines can tighten this once they exist.
function acceptFor(capability: CapabilityId): string {
  switch (capability) {
    case 'video':
      return 'image/*,video/*,application/pdf';
    case 'audio':
      return 'audio/*';
    case 'image':
    case 'prototype':
    case 'artifact':
    case 'deck':
    case 'template':
    default:
      return 'image/*,application/pdf';
  }
}

// --- Examples gallery ---------------------------------------------------
// Curated "good designs" we want builders to see before they type. Each
// example is fully click-to-remix: hitting a card pre-fills the composer
// with the exact prompt that produced this output, switches to the right
// capability, and applies the matching form factor — letting the user
// edit before committing instead of black-boxing the launch.
type ExampleThumbId =
  | 'mobile-habit'
  | 'web-dash'
  | 'web-landing'
  | 'deck-stack'
  | 'poster-bauhaus'
  | 'video-reveal';

interface ExampleDef {
  id: string;
  capability: CapabilityId;
  // Form override applied on click. Optional because most capabilities
  // don't carry a sub-form; only Prototype's form factor matters here.
  formOverride?: { prototype?: { factor: PrototypeFormFactor; fidelity: Fidelity } };
  thumb: ExampleThumbId;
  nameKey: keyof Dict;
  promptKey: keyof Dict;
  // Capability badge label used on the card. Kept in lockstep with the
  // capability tab labels above so users connect cards back to tabs.
  badgeKey: keyof Dict;
}

const EXAMPLES: ExampleDef[] = [
  {
    id: 'habit',
    capability: 'prototype',
    formOverride: { prototype: { factor: 'mobile', fidelity: 'hi-fi' } },
    thumb: 'mobile-habit',
    nameKey: 'launchpad.exampleHabitName',
    promptKey: 'launchpad.exampleHabitPrompt',
    badgeKey: 'launchpad.formFactorMobile',
  },
  {
    id: 'dash',
    capability: 'prototype',
    formOverride: { prototype: { factor: 'web', fidelity: 'hi-fi' } },
    thumb: 'web-dash',
    nameKey: 'launchpad.exampleDashName',
    promptKey: 'launchpad.exampleDashPrompt',
    badgeKey: 'launchpad.formFactorWeb',
  },
  {
    id: 'landing',
    capability: 'prototype',
    formOverride: { prototype: { factor: 'landing', fidelity: 'hi-fi' } },
    thumb: 'web-landing',
    nameKey: 'launchpad.exampleLandingName',
    promptKey: 'launchpad.exampleLandingPrompt',
    badgeKey: 'launchpad.formFactorLanding',
  },
  {
    id: 'deck',
    capability: 'deck',
    thumb: 'deck-stack',
    nameKey: 'launchpad.exampleDeckName',
    promptKey: 'launchpad.exampleDeckPrompt',
    badgeKey: 'launchpad.capDeck',
  },
  {
    id: 'poster',
    capability: 'image',
    thumb: 'poster-bauhaus',
    nameKey: 'launchpad.examplePosterName',
    promptKey: 'launchpad.examplePosterPrompt',
    badgeKey: 'launchpad.capImage',
  },
  {
    id: 'video',
    capability: 'video',
    thumb: 'video-reveal',
    nameKey: 'launchpad.exampleVideoName',
    promptKey: 'launchpad.exampleVideoPrompt',
    badgeKey: 'launchpad.capVideo',
  },
];

// Status pill class hooks reused from designs.* CSS so the timeline
// row picks up the same green/amber/red treatment as project cards.
const STATUS_CLASS: Record<ProjectDisplayStatus, string> = {
  not_started: 'design-card-status-not_started',
  queued: 'design-card-status-running',
  running: 'design-card-status-running',
  awaiting_input: 'design-card-status-awaiting_input',
  succeeded: 'design-card-status-succeeded',
  failed: 'design-card-status-failed',
  canceled: 'design-card-status-canceled',
};

const STATUS_LABEL_KEY: Record<ProjectDisplayStatus, keyof Dict> = {
  not_started: 'designs.status.notStarted',
  queued: 'designs.status.queued',
  running: 'designs.status.running',
  awaiting_input: 'designs.status.awaitingInput',
  succeeded: 'designs.status.succeeded',
  failed: 'designs.status.failed',
  canceled: 'designs.status.canceled',
};

interface Props {
  skills: SkillSummary[];
  projects: Project[];
  config: AppConfig;
  loading?: boolean;
  onCreateProject: (input: CreateInput & { pendingPrompt?: string }) => void;
  onOpenProject: (id: string) => void;
  onOpenSettings: () => void;
  onSwitchToLegacy: () => void;
}

export function Launchpad({
  skills: _skills,
  projects,
  config: _config,
  loading = false,
  onCreateProject,
  onOpenProject,
  onOpenSettings,
  onSwitchToLegacy,
}: Props) {
  const t = useT();
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dragHover, setDragHover] = useState(false);
  // Capability is what's selected via the tab strip above the chat;
  // form holds the per-capability product-form picks (UI form factor,
  // fidelity, …) that live in the collapsible Settings panel below.
  const [capability, setCapability] = useState<CapabilityId>('prototype');
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Multimodal start: prototype (and most other capabilities) accept a
  // sketch / wireframe / reference screenshot in addition to text. We
  // hold staged files locally and forward their names through the
  // prompt today (see handleSubmit). Full binary plumbing into the
  // CreateInput contract is a separate, larger PR — tracked as a
  // follow-up; this gives the agent the SIGNAL that references exist.
  const [attachments, setAttachments] = useState<File[]>([]);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const recent = useMemo(() => {
    return [...projects]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 8);
  }, [projects]);

  const trimmed = prompt.trim();
  const canSend = !submitting && trimmed.length > 0;

  // Create runs the active capability + form pair: prompt wins if typed,
  // otherwise the capability's starter is used so a builder can still
  // hit Create with an empty composer and get a sensible first task.
  // When references are attached, we annotate the prompt so the agent
  // knows references exist even though the metadata schema can't carry
  // binaries yet. Treat this as a temporary bridge.
  const handleSubmit = useCallback(() => {
    if (submitting) return;
    const starter = t(starterKeyFor(capability, form));
    const basePrompt = trimmed || starter;
    if (!basePrompt) return;
    const refSuffix =
      attachments.length > 0
        ? `\n\n[Attached references: ${attachments.map((f) => f.name).join(', ')}]`
        : '';
    const promptToSend = `${basePrompt}${refSuffix}`;
    setSubmitting(true);
    onCreateProject({
      name: deriveProjectName(basePrompt),
      skillId: null,
      designSystemId: null,
      metadata: buildMetadata(capability, form),
      pendingPrompt: promptToSend,
    });
  }, [attachments, capability, form, onCreateProject, submitting, t, trimmed]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd/Ctrl+Enter sends — matches chat composer convention.
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handlePickCapability = useCallback((next: CapabilityId) => {
    setCapability(next);
  }, []);

  // Click-to-remix from the Examples gallery: pre-fill the composer
  // with the example's prompt, switch to the matching capability, and
  // apply form overrides if the example specifies them. We focus the
  // composer so the user can immediately edit before hitting Create —
  // explicit "remix" feel rather than a black-box auto-launch.
  const handlePickExample = useCallback(
    (example: ExampleDef) => {
      setCapability(example.capability);
      if (example.formOverride?.prototype) {
        setForm((prev) => ({ ...prev, prototype: example.formOverride!.prototype! }));
      }
      setPrompt(t(example.promptKey));
      // Defer focus until after React commits the prompt-state update so
      // the textarea actually contains the value when we focus + select.
      requestAnimationFrame(() => {
        const el = promptRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    },
    [t],
  );

  // Build a short summary of the current settings so the (collapsed)
  // disclosure shows at a glance which form will be created.
  const settingsSummary = useMemo(() => {
    switch (capability) {
      case 'prototype': {
        const factor = PROTOTYPE_FORM_FACTORS.find((f) => f.id === form.prototype.factor);
        const fid = FIDELITIES.find((f) => f.id === form.prototype.fidelity);
        const factorLabel = factor ? t(factor.labelKey) : '';
        const fidLabel = fid ? t(fid.labelKey) : '';
        return [factorLabel, fidLabel].filter(Boolean).join(' · ');
      }
      case 'artifact':
        return 'Live · Hi-fi';
      case 'deck':
        return '10 slides';
      case 'template':
        return 'Reusable starter';
      case 'image':
        return `1:1 · ${DEFAULT_IMAGE_MODEL}`;
      case 'video':
        return `16:9 · 5s · ${DEFAULT_VIDEO_MODEL}`;
      case 'audio':
        return 'music · 10s';
    }
  }, [capability, form, t]);

  // --- Attachment handlers --------------------------------------------
  // Three pathways feed the same `attachments` queue: explicit file
  // picker (Attach button), drag-drop onto the page, and clipboard
  // paste in the textarea (Cmd+V on a screenshot). All three short-
  // circuit if the dropped item isn't a file (text drag-drop falls
  // through to the textarea naturally).
  const acceptList = useMemo(() => acceptFor(capability), [capability]);

  const handleAddFiles = useCallback((files: FileList | File[] | null) => {
    if (!files) return;
    const list = 'length' in files ? Array.from(files) : [];
    if (list.length === 0) return;
    setAttachments((prev) => [...prev, ...list]);
  }, []);

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (event: ReactChangeEvent<HTMLInputElement>) => {
      handleAddFiles(event.target.files);
      // Reset so picking the same file again still re-fires onChange.
      event.target.value = '';
    },
    [handleAddFiles],
  );

  const handleRemoveAttachment = useCallback((idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handlePromptPaste = useCallback(
    (event: ReactClipboardEvent<HTMLTextAreaElement>) => {
      const items = Array.from(event.clipboardData?.items ?? []);
      const fileItems = items
        .filter((it) => it.kind === 'file')
        .map((it) => it.getAsFile())
        .filter((f): f is File => f !== null);
      if (fileItems.length > 0) {
        // Don't let the textarea also try to insert a noisy filename.
        event.preventDefault();
        handleAddFiles(fileItems);
      }
    },
    [handleAddFiles],
  );

  const handleDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragHover(false);
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        handleAddFiles(files);
      }
    },
    [handleAddFiles],
  );

  const headerActions = (
    <div className="launchpad-chrome-actions">
      <span className="launchpad-mode-badge" title={t('launchpad.modeBadge')}>
        {t('launchpad.modeBadge')}
      </span>
      <button
        type="button"
        className="ghost launchpad-legacy-btn"
        onClick={onSwitchToLegacy}
        title={t('launchpad.legacyToggle')}
      >
        {t('launchpad.legacyToggle')}
      </button>
      <button
        type="button"
        className="settings-icon-btn"
        onClick={onOpenSettings}
        title={t('entry.openSettingsTitle')}
        aria-label={t('entry.openSettingsAria')}
      >
        <Icon name="settings" size={17} />
      </button>
    </div>
  );

  return (
    <div className="launchpad-shell">
      <AppChromeHeader actions={headerActions} />
      <main
        className={`launchpad-main${dragHover ? ' is-drag-hover' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragHover(true);
        }}
        onDragLeave={() => setDragHover(false)}
        onDrop={handleDrop}
      >
        {loading ? (
          <CenteredLoader label={t('entry.loadingWorkspace')} />
        ) : (
          <div className="launchpad-content">
            <section className="launchpad-hero" aria-labelledby="launchpad-hero-brand">
              {/* Brand-first hero: product name is the primary visual element,
                  tagline supports underneath. The chrome header still shows
                  the small "Open Design" wordmark, but the splash establishes
                  the brand at full scale. */}
              <h1 id="launchpad-hero-brand" className="launchpad-hero-brand">
                {t('launchpad.heroBrand')}
              </h1>
              <p className="launchpad-hero-tagline">{t('launchpad.heroTagline')}</p>
            </section>

            <section className="launchpad-prompt-block" aria-label={t('launchpad.placeholder')}>
              <CapabilityTabs
                capabilities={CAPABILITIES}
                active={capability}
                onPick={handlePickCapability}
              />
              <PromptBar
                value={prompt}
                onChange={setPrompt}
                onKeyDown={handleKeyDown}
                onPaste={handlePromptPaste}
                onSubmit={handleSubmit}
                canSend={canSend}
                inputRef={promptRef}
                placeholder={t('launchpad.placeholder')}
                hintText={t('launchpad.inputHint')}
                attachLabel={t('launchpad.attach')}
                importLabel={t('launchpad.import')}
                createLabel={t('launchpad.create')}
                attachmentListLabel={t('launchpad.attachListAria')}
                attachmentRemoveLabel={t('launchpad.attachRemove')}
                attachments={attachments}
                onAttachClick={handleAttachClick}
                onRemoveAttachment={handleRemoveAttachment}
                acceptList={acceptList}
                fileInputRef={fileInputRef}
                onFileInputChange={handleFileInputChange}
              />
              <SettingsPanel
                capability={capability}
                form={form}
                onFormChange={setForm}
                open={settingsOpen}
                onToggle={() => setSettingsOpen((prev) => !prev)}
                toggleLabel={t('launchpad.settingsToggle')}
                summary={settingsSummary}
                emptyHint={t('launchpad.settingsComingSoon')}
                formFactorLabel={t('launchpad.formFactorLabel')}
                fidelityLabel={t('launchpad.fidelityLabel')}
              />
            </section>

            <ExamplesGallery
              examples={EXAMPLES}
              onPick={handlePickExample}
              onBrowseAll={onSwitchToLegacy}
              titleLabel={t('launchpad.examplesTitle')}
              browseAllLabel={t('launchpad.examplesViewAll')}
              openLabel={t('launchpad.exampleOpenLabel')}
            />

            <section
              className="launchpad-timeline"
              aria-labelledby="launchpad-timeline-title"
            >
              <header className="launchpad-timeline-head">
                <h2 id="launchpad-timeline-title">{t('launchpad.recentTitle')}</h2>
              </header>
              {recent.length === 0 ? (
                <p className="launchpad-timeline-empty">{t('launchpad.recentEmpty')}</p>
              ) : (
                <ul className="launchpad-timeline-list" role="list">
                  {recent.map((project) => (
                    <TimelineRow
                      key={project.id}
                      project={project}
                      onResume={() => onOpenProject(project.id)}
                      relativeLabel={relativeTimeShort(project.updatedAt, t)}
                      statusLabel={
                        project.status?.value
                          ? t(STATUS_LABEL_KEY[project.status.value])
                          : t(STATUS_LABEL_KEY.not_started)
                      }
                      statusClass={
                        project.status?.value
                          ? STATUS_CLASS[project.status.value]
                          : STATUS_CLASS.not_started
                      }
                      resumeLabel={t('launchpad.resume')}
                    />
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

interface PromptBarProps {
  value: string;
  onChange: (next: string) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste: (event: ReactClipboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  canSend: boolean;
  inputRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  placeholder: string;
  hintText: string;
  attachLabel: string;
  importLabel: string;
  createLabel: string;
  attachmentListLabel: string;
  attachmentRemoveLabel: string;
  attachments: File[];
  onAttachClick: () => void;
  onRemoveAttachment: (idx: number) => void;
  acceptList: string;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onFileInputChange: (event: ReactChangeEvent<HTMLInputElement>) => void;
}

function PromptBar({
  value,
  onChange,
  onKeyDown,
  onPaste,
  onSubmit,
  canSend,
  inputRef,
  placeholder,
  hintText,
  attachLabel,
  importLabel,
  createLabel,
  attachmentListLabel,
  attachmentRemoveLabel,
  attachments,
  onAttachClick,
  onRemoveAttachment,
  acceptList,
  fileInputRef,
  onFileInputChange,
}: PromptBarProps) {
  return (
    <div className="launchpad-prompt-bar">
      <textarea
        ref={inputRef}
        className="launchpad-prompt-input"
        rows={3}
        value={value}
        onChange={(event: ReactChangeEvent<HTMLTextAreaElement>) =>
          onChange(event.target.value)
        }
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        placeholder={placeholder}
        autoFocus
      />
      {attachments.length > 0 && (
        <ul
          className="launchpad-attach-list"
          role="list"
          aria-label={attachmentListLabel}
        >
          {attachments.map((file, idx) => (
            <li key={`${file.name}-${idx}`} className="launchpad-attach-chip">
              <Icon
                name={file.type.startsWith('image/') ? 'image' : 'file'}
                size={11}
              />
              <span className="launchpad-attach-chip-name" title={file.name}>
                {file.name}
              </span>
              <button
                type="button"
                className="launchpad-attach-chip-remove"
                onClick={() => onRemoveAttachment(idx)}
                aria-label={`${attachmentRemoveLabel}: ${file.name}`}
                title={attachmentRemoveLabel}
              >
                <Icon name="close" size={10} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="launchpad-prompt-actions">
        <div className="launchpad-prompt-tools">
          <button
            type="button"
            className="launchpad-tool-btn"
            onClick={onAttachClick}
            title={attachLabel}
          >
            <Icon name="image" size={13} />
            <span>{attachLabel}</span>
          </button>
          {/* Hidden, programmatically-triggered. accept= is capability-aware
              so e.g. Audio tab restricts to audio MIME, Video adds video/*. */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptList}
            className="launchpad-file-input"
            onChange={onFileInputChange}
            tabIndex={-1}
            aria-hidden
          />
          <button
            type="button"
            className="launchpad-tool-btn"
            disabled
            title={importLabel}
          >
            <Icon name="external-link" size={13} />
            <span>{importLabel}</span>
          </button>
        </div>
        <button
          type="button"
          className="primary launchpad-create-btn"
          onClick={onSubmit}
          disabled={!canSend}
          aria-label={createLabel}
        >
          <Icon name="plus" size={13} />
          <span>{createLabel}</span>
        </button>
      </div>
      <p className="launchpad-prompt-hint" aria-hidden>
        {hintText}
      </p>
    </div>
  );
}

// CapabilityTabs — small chip strip above the composer. Acts as a
// modality switcher; selection is sticky (one always active) and it
// does NOT auto-launch a project, matching v0/Lovable conventions.
interface CapabilityTabsProps {
  capabilities: CapabilityDef[];
  active: CapabilityId;
  onPick: (id: CapabilityId) => void;
}

function CapabilityTabs({ capabilities, active, onPick }: CapabilityTabsProps) {
  const t = useT();
  return (
    <div
      className="launchpad-tabs"
      role="tablist"
      aria-label={t('launchpad.heroTagline')}
    >
      {capabilities.map((cap) => {
        const isActive = active === cap.id;
        return (
          <button
            key={cap.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`launchpad-tab${isActive ? ' is-active' : ''}`}
            onClick={() => onPick(cap.id)}
          >
            <span className="launchpad-tab-glyph" aria-hidden>
              {cap.glyph}
            </span>
            <span className="launchpad-tab-label">{t(cap.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}

// SettingsPanel — collapsible disclosure below the composer. Holds the
// per-capability product-form picker. Closed by default; the toggle
// shows a one-line summary of current selections so the form stays
// visible without forcing the panel open.
interface SettingsPanelProps {
  capability: CapabilityId;
  form: FormState;
  onFormChange: (next: FormState) => void;
  open: boolean;
  onToggle: () => void;
  toggleLabel: string;
  summary: string;
  emptyHint: string;
  formFactorLabel: string;
  fidelityLabel: string;
}

function SettingsPanel({
  capability,
  form,
  onFormChange,
  open,
  onToggle,
  toggleLabel,
  summary,
  emptyHint,
  formFactorLabel,
  fidelityLabel,
}: SettingsPanelProps) {
  const t = useT();
  return (
    <div className={`launchpad-settings${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="launchpad-settings-toggle"
        onClick={onToggle}
        aria-expanded={open}
      >
        <Icon name="settings" size={12} />
        <span className="launchpad-settings-toggle-label">{toggleLabel}</span>
        <span className="launchpad-settings-toggle-summary">{summary}</span>
        <span className="launchpad-settings-chev" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && (
        <div className="launchpad-settings-panel">
          {capability === 'prototype' ? (
            <>
              <SegmentedRow
                label={formFactorLabel}
                options={PROTOTYPE_FORM_FACTORS.map((f) => ({
                  id: f.id,
                  label: t(f.labelKey),
                }))}
                value={form.prototype.factor}
                onChange={(next) =>
                  onFormChange({
                    ...form,
                    prototype: { ...form.prototype, factor: next as PrototypeFormFactor },
                  })
                }
              />
              <SegmentedRow
                label={fidelityLabel}
                options={FIDELITIES.map((f) => ({
                  id: f.id,
                  label: t(f.labelKey),
                }))}
                value={form.prototype.fidelity}
                onChange={(next) =>
                  onFormChange({
                    ...form,
                    prototype: { ...form.prototype, fidelity: next as Fidelity },
                  })
                }
              />
            </>
          ) : (
            <p className="launchpad-settings-empty">{emptyHint}</p>
          )}
        </div>
      )}
    </div>
  );
}

// SegmentedRow — labelled segmented control used by the Settings panel
// for picking form factor / fidelity / etc.
interface SegmentedOption {
  id: string;
  label: string;
}

interface SegmentedRowProps {
  label: string;
  options: SegmentedOption[];
  value: string;
  onChange: (next: string) => void;
}

function SegmentedRow({ label, options, value, onChange }: SegmentedRowProps) {
  return (
    <div className="launchpad-segmented-row">
      <span className="launchpad-segmented-label">{label}</span>
      <div className="launchpad-segmented" role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const isActive = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              className={`launchpad-segmented-btn${isActive ? ' is-active' : ''}`}
              onClick={() => onChange(opt.id)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Examples gallery rendering ---------------------------------------
interface ExamplesGalleryProps {
  examples: ExampleDef[];
  onPick: (example: ExampleDef) => void;
  onBrowseAll: () => void;
  titleLabel: string;
  browseAllLabel: string;
  openLabel: string;
}

function ExamplesGallery({
  examples,
  onPick,
  onBrowseAll,
  titleLabel,
  browseAllLabel,
  openLabel,
}: ExamplesGalleryProps) {
  const t = useT();
  return (
    <section className="launchpad-examples" aria-labelledby="launchpad-examples-title">
      <header className="launchpad-examples-head">
        <h2 id="launchpad-examples-title" className="launchpad-examples-title">
          {titleLabel}
        </h2>
        <button
          type="button"
          className="launchpad-more-link launchpad-examples-browse"
          onClick={onBrowseAll}
        >
          {browseAllLabel} →
        </button>
      </header>
      <ul className="launchpad-examples-grid" role="list">
        {examples.map((ex) => (
          <li key={ex.id} className="launchpad-example">
            <button
              type="button"
              className={`launchpad-example-btn launchpad-example-thumb-${ex.thumb}`}
              onClick={() => onPick(ex)}
              title={t(ex.promptKey)}
            >
              <span className="launchpad-example-thumb" aria-hidden>
                <ExampleThumb id={ex.thumb} />
              </span>
              <span className="launchpad-example-meta">
                <span className="launchpad-example-badge">{t(ex.badgeKey)}</span>
                <span className="launchpad-example-name">{t(ex.nameKey)}</span>
              </span>
              <span className="launchpad-example-cta" aria-hidden>
                {openLabel} →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Stylized inline SVG thumbnails. Curated, not photorealistic — the goal
// is to communicate the OUTPUT TYPE quickly (phone shape, dashboard,
// poster geometry, motion frame) rather than render literal output. Each
// thumbnail shares the same 200×120 viewBox so the grid stays aligned.
function ExampleThumb({ id }: { id: ExampleThumbId }) {
  switch (id) {
    case 'mobile-habit':
      // Centered phone outline with 5 horizontal habit rows + a small
      // streak badge — reads as "habit-tracker mobile UI" at a glance.
      return (
        <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
          <rect x="78" y="14" width="44" height="92" rx="6" fill="#fff" stroke="#cdd0d4" strokeWidth="1.2" />
          <rect x="84" y="22" width="32" height="6" rx="2" fill="#1f1f1f" />
          {[36, 48, 60, 72, 84].map((y, i) => (
            <g key={y}>
              <rect x="84" y={y} width="32" height="7" rx="2" fill="#f0ece6" />
              {i < 4 && <circle cx="111" cy={y + 3.5} r="2.4" fill="#c96442" />}
            </g>
          ))}
          <rect x="84" y="96" width="32" height="6" rx="2" fill="#e9e6df" />
        </svg>
      );
    case 'web-dash':
      // Sidebar + hero KPIs + bar chart — generic SaaS admin shape.
      return (
        <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="14" width="180" height="92" rx="6" fill="#fff" stroke="#cdd0d4" strokeWidth="1" />
          <rect x="10" y="14" width="38" height="92" rx="6" fill="#f6f3ed" />
          {[24, 36, 48, 60].map((y) => (
            <rect key={y} x="16" y={y} width="26" height="3" rx="1.5" fill="#cdd0d4" />
          ))}
          <rect x="56" y="22" width="40" height="20" rx="3" fill="#fbeee5" />
          <rect x="100" y="22" width="40" height="20" rx="3" fill="#fbeee5" />
          <rect x="144" y="22" width="40" height="20" rx="3" fill="#fbeee5" />
          {[
            { x: 60, h: 18 },
            { x: 76, h: 32 },
            { x: 92, h: 24 },
            { x: 108, h: 40 },
            { x: 124, h: 30 },
            { x: 140, h: 50 },
            { x: 156, h: 36 },
            { x: 172, h: 46 },
          ].map(({ x, h }) => (
            <rect key={x} x={x} y={96 - h} width="10" height={h} rx="1.5" fill="#c96442" />
          ))}
        </svg>
      );
    case 'web-landing':
      // Hero block + 3-feature grid + footer bar — landing-page silhouette.
      return (
        <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="14" width="180" height="92" rx="6" fill="#fff" stroke="#cdd0d4" strokeWidth="1" />
          <rect x="20" y="22" width="80" height="6" rx="2" fill="#1f1f1f" />
          <rect x="20" y="34" width="120" height="4" rx="1.5" fill="#cdd0d4" />
          <rect x="20" y="42" width="100" height="4" rx="1.5" fill="#cdd0d4" />
          <rect x="20" y="54" width="40" height="12" rx="6" fill="#c96442" />
          {[20, 80, 140].map((x) => (
            <g key={x}>
              <rect x={x} y="76" width="40" height="22" rx="3" fill="#f6f3ed" />
              <rect x={x + 4} y="80" width="14" height="3" rx="1.5" fill="#1f1f1f" />
              <rect x={x + 4} y="86" width="32" height="2.5" rx="1.25" fill="#cdd0d4" />
              <rect x={x + 4} y="91" width="22" height="2.5" rx="1.25" fill="#cdd0d4" />
            </g>
          ))}
        </svg>
      );
    case 'deck-stack':
      // Three slide rectangles fanned out — pitch-deck silhouette.
      return (
        <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
          <rect x="48" y="22" width="100" height="68" rx="4" transform="rotate(-6 98 56)" fill="#fff" stroke="#cdd0d4" strokeWidth="1" />
          <rect x="56" y="28" width="100" height="68" rx="4" transform="rotate(-2 106 62)" fill="#fff" stroke="#cdd0d4" strokeWidth="1" />
          <rect x="64" y="34" width="100" height="68" rx="4" fill="#fff" stroke="#1f1f1f" strokeWidth="1.2" />
          <rect x="72" y="42" width="46" height="6" rx="2" fill="#1f1f1f" />
          <rect x="72" y="54" width="80" height="3" rx="1.5" fill="#cdd0d4" />
          <rect x="72" y="62" width="68" height="3" rx="1.5" fill="#cdd0d4" />
          <rect x="72" y="78" width="20" height="14" rx="2" fill="#c96442" />
          <rect x="98" y="78" width="20" height="14" rx="2" fill="#f6c66d" />
          <rect x="124" y="78" width="20" height="14" rx="2" fill="#5b8def" />
        </svg>
      );
    case 'poster-bauhaus':
      // Bauhaus-style geometric composition — primary palette poster.
      return (
        <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="14" width="180" height="92" rx="4" fill="#f6f1e7" />
          <rect x="22" y="26" width="58" height="58" fill="#c93838" />
          <circle cx="128" cy="60" r="28" fill="#2b5dd1" />
          <polygon points="148,98 188,98 168,62" fill="#f5c83a" />
          <rect x="22" y="92" width="92" height="3" fill="#1f1f1f" />
        </svg>
      );
    case 'video-reveal':
      // Frame border + play triangle + motion lines — motion piece.
      return (
        <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="14" width="180" height="92" rx="6" fill="#1f1f1f" />
          <rect x="14" y="18" width="172" height="84" rx="4" fill="#0f0f10" />
          <polygon points="92,46 92,76 116,61" fill="#fff" />
          <line x1="30" y1="92" x2="60" y2="92" stroke="#c96442" strokeWidth="2" strokeLinecap="round" />
          <line x1="68" y1="92" x2="92" y2="92" stroke="#c96442" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <line x1="100" y1="92" x2="118" y2="92" stroke="#c96442" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
          <circle cx="170" cy="28" r="3" fill="#c96442" />
        </svg>
      );
  }
}

interface TimelineRowProps {
  project: Project;
  relativeLabel: string;
  statusLabel: string;
  statusClass: string;
  resumeLabel: string;
  onResume: () => void;
}

function TimelineRow({
  project,
  relativeLabel,
  statusLabel,
  statusClass,
  resumeLabel,
  onResume,
}: TimelineRowProps) {
  return (
    <li className="launchpad-timeline-row">
      <button
        type="button"
        className="launchpad-timeline-row-main"
        onClick={onResume}
      >
        <span className="launchpad-timeline-when">{relativeLabel}</span>
        <span className="launchpad-timeline-name">{project.name}</span>
        <span className={`launchpad-timeline-status ${statusClass}`}>
          {statusLabel}
        </span>
      </button>
      <button
        type="button"
        className="ghost launchpad-timeline-resume"
        onClick={onResume}
      >
        {resumeLabel}
      </button>
    </li>
  );
}

// Take the first ~6 words / 48 chars of the prompt as the project name.
// Falls back to "Untitled" if the prompt is empty or whitespace-only.
function deriveProjectName(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Untitled';
  const words = cleaned.split(' ').slice(0, 6).join(' ');
  return words.length > 48 ? `${words.slice(0, 45)}…` : words;
}

// Compact relative time — "3h", "2d", "just now". Uses `common.*Short`
// keys so the timeline rows stay scannable without per-row dot prefixes.
function relativeTimeShort(timestamp: number, t: ReturnType<typeof useT>): string {
  const diffMs = Date.now() - timestamp;
  if (diffMs < 60_000) return t('common.now');
  if (diffMs < 60 * 60_000) {
    return t('common.minutesShort', { n: Math.floor(diffMs / 60_000) });
  }
  if (diffMs < 24 * 60 * 60_000) {
    return t('common.hoursShort', { n: Math.floor(diffMs / (60 * 60_000)) });
  }
  return t('common.daysShort', { n: Math.floor(diffMs / (24 * 60 * 60_000)) });
}
