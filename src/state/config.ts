import type { AppConfig, MusicConfig } from '../types';

const STORAGE_KEY = 'open-design:config';

export const DEFAULT_MUSIC_CONFIG: MusicConfig = {
  provider: 'suno',
  apiKey: '',
  // sunoapi.org is the most popular Bring-Your-Own-Key gateway for Suno.
  // Any compatible mirror that exposes /api/v1/generate + /generate/record-info
  // works by changing this URL.
  baseUrl: 'https://api.sunoapi.org',
  model: 'V4',
};

export const DEFAULT_CONFIG: AppConfig = {
  mode: 'daemon',
  apiKey: '',
  baseUrl: 'https://api.anthropic.com',
  model: 'claude-sonnet-4-5',
  agentId: null,
  skillId: null,
  designSystemId: null,
  onboardingCompleted: false,
  agentModels: {},
  music: { ...DEFAULT_MUSIC_CONFIG },
};

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    // Deep-merge the music block so older stored configs (which lack it)
    // don't drop fields when partial values are written back.
    const music: MusicConfig = {
      ...DEFAULT_MUSIC_CONFIG,
      ...(parsed.music ?? {}),
    };
    return { ...DEFAULT_CONFIG, ...parsed, music };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: AppConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
