import type { MusicTrack } from '../types';

// Tracks live entirely in localStorage — the daemon doesn't store them
// because (a) audio URLs are remote anyway and (b) keeping the studio
// self-contained means it works in API-only mode without any DB.
const STORAGE_KEY = 'open-design:music-tracks';
const MAX_TRACKS = 100;

export function loadTracks(): MusicTrack[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive normalisation in case a previous version stored a
    // different shape — drop entries missing the discriminating fields.
    return parsed.filter(
      (t): t is MusicTrack =>
        t && typeof t === 'object' && typeof t.id === 'string',
    );
  } catch {
    return [];
  }
}

export function saveTracks(tracks: MusicTrack[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Cap the library so localStorage doesn't balloon. Newest first.
    const trimmed = tracks.slice(0, MAX_TRACKS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota exceeded — silently drop, the user can clear history */
  }
}

export function clearTracks(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function upsertTrack(
  tracks: MusicTrack[],
  next: MusicTrack,
): MusicTrack[] {
  const idx = tracks.findIndex((t) => t.id === next.id);
  if (idx === -1) return [next, ...tracks];
  const copy = tracks.slice();
  copy[idx] = next;
  return copy;
}
