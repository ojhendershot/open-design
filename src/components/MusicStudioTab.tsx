import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import {
  generateMusic,
  mergePollIntoTracks,
  pollMusic,
} from '../providers/music';
import { DEFAULT_MUSIC_CONFIG } from '../state/config';
import {
  clearTracks,
  loadTracks,
  saveTracks,
  upsertTrack,
} from '../state/music';
import type { AppConfig, MusicConfig, MusicTrack } from '../types';
import { Icon } from './Icon';

interface Props {
  config: AppConfig;
  onOpenSettings: () => void;
}

const POLL_INTERVAL_MS = 4000;
const POLL_MAX_TRIES = 90; // ~6 minutes

type Mode = 'simple' | 'custom';

export function MusicStudioTab({ config, onOpenSettings }: Props) {
  const t = useT();
  const music: MusicConfig = config.music ?? DEFAULT_MUSIC_CONFIG;

  const [mode, setMode] = useState<Mode>('simple');
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [style, setStyle] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [instrumental, setInstrumental] = useState(false);
  const [model, setModel] = useState(music.model || DEFAULT_MUSIC_CONFIG.model);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [pendingTaskIds, setPendingTaskIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore tracks once on mount.
  useEffect(() => {
    setTracks(loadTracks());
  }, []);

  // Persist track changes back to localStorage.
  useEffect(() => {
    saveTracks(tracks);
  }, [tracks]);

  // Update the model field when the user switches providers in Settings.
  useEffect(() => {
    setModel(music.model || DEFAULT_MUSIC_CONFIG.model);
  }, [music.model, music.provider]);

  // Polling for in-flight tasks. Each entry in `pendingTaskIds` triggers
  // its own loop; entries drop themselves on completion / failure.
  const pollersRef = useRef<Map<string, number>>(new Map());

  const startPolling = useCallback(
    (taskId: string) => {
      // Avoid double-attaching pollers if the user re-opens the tab.
      if (pollersRef.current.has(taskId)) return;
      let tries = 0;
      let cancelled = false;
      const tick = async () => {
        if (cancelled) return;
        tries += 1;
        try {
          const result = await pollMusic(music, taskId);
          // Replace every track that owns this taskId with the latest
          // upstream payload. Keep `id`/`createdAt` stable so the UI
          // doesn't shuffle while audio fills in.
          setTracks((curr) => {
            const owners = curr.filter((t) => t.taskId === taskId);
            if (owners.length === 0) return curr;
            const base = owners[0]!;
            const merged = mergePollIntoTracks(base, result);
            // Remove every existing entry for this task and re-insert
            // the merged set in the same slot at the head.
            const idx = curr.findIndex((t) => t.taskId === taskId);
            const without = curr.filter((t) => t.taskId !== taskId);
            const head = without.slice(0, idx);
            const tail = without.slice(idx);
            return [...head, ...merged, ...tail];
          });
          if (
            result.status === 'complete' ||
            result.status === 'failed' ||
            tries >= POLL_MAX_TRIES
          ) {
            cancelled = true;
            const handle = pollersRef.current.get(taskId);
            if (handle !== undefined) clearTimeout(handle);
            pollersRef.current.delete(taskId);
            setPendingTaskIds((ids) => ids.filter((x) => x !== taskId));
            return;
          }
        } catch (err) {
          // One failed poll isn't fatal — back off until a few in a row
          // fail, but surface the error on the latest matching track so
          // the user sees what's wrong.
          const message = err instanceof Error ? err.message : String(err);
          setTracks((curr) =>
            curr.map((tk) =>
              tk.taskId === taskId
                ? { ...tk, error: message, status: tk.status === 'pending' ? 'pending' : tk.status }
                : tk,
            ),
          );
          if (tries >= 5) {
            cancelled = true;
            pollersRef.current.delete(taskId);
            setPendingTaskIds((ids) => ids.filter((x) => x !== taskId));
            setTracks((curr) =>
              curr.map((tk) =>
                tk.taskId === taskId
                  ? { ...tk, status: 'failed', error: message }
                  : tk,
              ),
            );
            return;
          }
        }
        const handle = window.setTimeout(tick, POLL_INTERVAL_MS);
        pollersRef.current.set(taskId, handle);
      };
      const handle = window.setTimeout(tick, POLL_INTERVAL_MS);
      pollersRef.current.set(taskId, handle);
    },
    [music],
  );

  // Resume pollers when the tab mounts and there are tasks marked as
  // pending/streaming in localStorage (page-refresh case).
  useEffect(() => {
    const open = new Set<string>();
    for (const tk of tracks) {
      if (tk.status === 'pending' || tk.status === 'streaming') {
        open.add(tk.taskId);
      }
    }
    for (const id of open) {
      startPolling(id);
    }
    setPendingTaskIds(Array.from(open));
    return () => {
      for (const handle of pollersRef.current.values()) {
        clearTimeout(handle);
      }
      pollersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apiKeyMissing = music.provider !== 'acestep' && !music.apiKey.trim();

  const promptValid =
    mode === 'simple' ? prompt.trim().length > 0 : lyrics.trim().length > 0;
  const canGenerate =
    !submitting && !apiKeyMissing && promptValid && music.baseUrl.trim().length > 0;

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setSubmitting(true);
    setError(null);
    try {
      const customMode = mode === 'custom';
      const result = await generateMusic(music, {
        prompt: customMode ? lyrics : prompt,
        style: customMode ? style : undefined,
        title: songTitle || undefined,
        instrumental,
        customMode,
        model,
      });
      const now = Date.now();
      const placeholder: MusicTrack = {
        id: `${result.taskId}::seed`,
        taskId: result.taskId,
        provider: music.provider,
        title: songTitle || (mode === 'simple' ? prompt : style || t('music.untitledTrack')),
        prompt: customMode ? lyrics : prompt,
        style: customMode ? style : undefined,
        lyrics: customMode ? lyrics : undefined,
        instrumental,
        model,
        createdAt: now,
        status: 'pending',
      };
      setTracks((curr) => upsertTrack(curr, placeholder));
      setPendingTaskIds((ids) => [...ids, result.taskId]);
      startPolling(result.taskId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }, [
    canGenerate,
    instrumental,
    lyrics,
    mode,
    model,
    music,
    prompt,
    songTitle,
    startPolling,
    style,
    t,
  ]);

  const removeTrack = useCallback(
    (id: string) => {
      if (!window.confirm(t('music.deleteTrackConfirm'))) return;
      setTracks((curr) => curr.filter((tk) => tk.id !== id));
    },
    [t],
  );

  const clearLibrary = useCallback(() => {
    if (!window.confirm(t('music.clearAllConfirm'))) return;
    clearTracks();
    setTracks([]);
    for (const handle of pollersRef.current.values()) {
      clearTimeout(handle);
    }
    pollersRef.current.clear();
    setPendingTaskIds([]);
  }, [t]);

  return (
    <div className="music-studio">
      <header className="music-studio-head">
        <div>
          <h2>{t('music.title')}</h2>
          <p className="hint">{t('music.subtitle')}</p>
        </div>
        {tracks.length > 0 ? (
          <button
            type="button"
            className="ghost danger-link"
            onClick={clearLibrary}
            title={t('music.clearAll')}
          >
            <Icon name="trash" size={12} />
            <span>{t('music.clearAll')}</span>
          </button>
        ) : null}
      </header>

      {apiKeyMissing ? (
        <div className="music-banner">
          <span>{t('music.errorNoKey')}</span>
          <button type="button" className="ghost" onClick={onOpenSettings}>
            {t('music.openSettings')}
          </button>
        </div>
      ) : null}

      <section className="music-form">
        <div
          className="seg-control"
          role="tablist"
          aria-label={t('music.modeSimple')}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'simple'}
            className={'seg-btn' + (mode === 'simple' ? ' active' : '')}
            onClick={() => setMode('simple')}
          >
            <span className="seg-title">{t('music.modeSimple')}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'custom'}
            className={'seg-btn' + (mode === 'custom' ? ' active' : '')}
            onClick={() => setMode('custom')}
          >
            <span className="seg-title">{t('music.modeCustom')}</span>
          </button>
        </div>

        {mode === 'simple' ? (
          <label className="field">
            <span className="field-label">{t('music.promptLabel')}</span>
            <textarea
              rows={4}
              value={prompt}
              placeholder={t('music.promptPlaceholder')}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>
        ) : (
          <>
            <label className="field">
              <span className="field-label">{t('music.lyricsLabel')}</span>
              <textarea
                rows={8}
                value={lyrics}
                placeholder={t('music.lyricsPlaceholder')}
                onChange={(e) => setLyrics(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">{t('music.styleLabel')}</span>
              <input
                type="text"
                value={style}
                placeholder={t('music.stylePlaceholder')}
                onChange={(e) => setStyle(e.target.value)}
              />
            </label>
          </>
        )}

        <div className="music-form-row">
          <label className="field">
            <span className="field-label">{t('music.titleLabel')}</span>
            <input
              type="text"
              value={songTitle}
              placeholder={t('music.titlePlaceholder')}
              onChange={(e) => setSongTitle(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('music.modelLabel')}</span>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </label>
        </div>

        <label className="music-toggle">
          <input
            type="checkbox"
            checked={instrumental}
            onChange={(e) => setInstrumental(e.target.checked)}
          />
          <span className="music-toggle-text">
            <span className="music-toggle-title">
              {t('music.instrumentalLabel')}
            </span>
            <span className="music-toggle-hint">
              {t('music.instrumentalHint')}
            </span>
          </span>
        </label>

        <p className="hint music-tip">{t('music.proTipQuickPrompt')}</p>

        {error ? <div className="music-error">{error}</div> : null}

        <div className="music-form-actions">
          <button
            type="button"
            className="primary"
            disabled={!canGenerate}
            onClick={handleGenerate}
          >
            {submitting || pendingTaskIds.length > 0
              ? t('music.generating')
              : t('music.generate')}
          </button>
        </div>
      </section>

      <section className="music-library">
        <div className="music-library-head">
          <h3>{t('music.libraryTitle')}</h3>
          <span className="music-library-count">{tracks.length}</span>
        </div>
        {tracks.length === 0 ? (
          <div className="music-empty">
            <Icon name="music" size={28} />
            <strong>{t('music.empty')}</strong>
            <p>{t('music.emptyHint')}</p>
          </div>
        ) : (
          <ul className="music-track-list">
            {tracks.map((tk) => (
              <TrackCard key={tk.id} track={tk} onRemove={() => removeTrack(tk.id)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

interface TrackCardProps {
  track: MusicTrack;
  onRemove: () => void;
}

function TrackCard({ track, onRemove }: TrackCardProps) {
  const t = useT();
  const statusLabel = (() => {
    switch (track.status) {
      case 'complete':
        return t('music.statusComplete');
      case 'streaming':
        return t('music.statusStreaming');
      case 'failed':
        return t('music.statusFailed');
      default:
        return t('music.statusPending');
    }
  })();

  return (
    <li className={`music-track music-track-${track.status}`}>
      <div className="music-track-art">
        {track.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.imageUrl} alt="" />
        ) : (
          <Icon name="music" size={20} />
        )}
      </div>
      <div className="music-track-body">
        <div className="music-track-row">
          <strong className="music-track-title">
            {track.title || t('music.untitledTrack')}
          </strong>
          <span className={`music-track-status music-track-status-${track.status}`}>
            {statusLabel}
          </span>
        </div>
        {track.style ? (
          <div className="music-track-meta">{track.style}</div>
        ) : null}
        {track.error ? (
          <div className="music-track-error">{track.error}</div>
        ) : null}
        {track.audioUrl ? (
          <audio
            controls
            src={track.audioUrl}
            preload="none"
            className="music-track-audio"
          />
        ) : track.status === 'pending' || track.status === 'streaming' ? (
          <div className="music-track-progress">
            <span className="music-track-progress-bar" />
          </div>
        ) : null}
      </div>
      <div className="music-track-actions">
        {track.audioUrl ? (
          <a
            className="ghost icon-btn"
            href={track.audioUrl}
            download={`${(track.title || 'track').replace(/[^\w.-]+/g, '_')}.mp3`}
            target="_blank"
            rel="noopener noreferrer"
            title={t('music.downloadTrack')}
          >
            <Icon name="download" size={14} />
          </a>
        ) : null}
        <button
          type="button"
          className="ghost icon-btn"
          onClick={onRemove}
          title={t('music.deleteTrack')}
        >
          <Icon name="trash" size={14} />
        </button>
      </div>
    </li>
  );
}
