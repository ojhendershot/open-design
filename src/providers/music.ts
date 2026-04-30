/**
 * Music generation client. Talks to a Suno-compatible REST gateway
 * (Bring-Your-Own-Key style: `Authorization: Bearer <apiKey>`) or to a
 * local ACE-Step Gradio server.
 *
 * Browser → daemon → upstream
 *  - The browser calls `/api/music/proxy` on the local daemon. The proxy
 *    forwards to the upstream URL with the user's apiKey, dodging CORS
 *    and keeping keys out of the page when possible.
 *  - When the daemon isn't running (API mode without od daemon) we fall
 *    back to `fetch` directly. Most popular Suno gateways advertise CORS
 *    so this still works for plain SPA usage.
 */
import type {
  MusicConfig,
  MusicGenerateInput,
  MusicProviderId,
  MusicTrack,
} from '../types';

interface ProxyRequest {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
}

interface ProxyResponse {
  status: number;
  ok: boolean;
  data: unknown;
}

async function callProxy(req: ProxyRequest): Promise<ProxyResponse> {
  // Try the daemon first — it forwards server-side which avoids CORS,
  // and never exposes the apiKey to other origins. If the daemon is
  // offline (Vite dev without `od daemon`, Next dev only) we transparently
  // fall back to a direct fetch from the browser.
  try {
    const proxied = await fetch('/api/music/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (proxied.ok) {
      return (await proxied.json()) as ProxyResponse;
    }
    if (proxied.status !== 404) {
      // Daemon explicitly errored — surface its body so the studio can
      // show a real message.
      const text = await proxied.text();
      throw new Error(text || `proxy ${proxied.status}`);
    }
    // 404 — daemon isn't on this build, keep going to direct fetch.
  } catch (err) {
    // Network error to /api/music/proxy → try direct.
    if (err instanceof Error && err.message && /proxy \d+/.test(err.message)) {
      throw err;
    }
  }

  // Direct fetch fallback. CORS-permissive Suno gateways (sunoapi.org,
  // most public mirrors) work; anything stricter will surface a clearer
  // error message in the studio.
  const directHeaders = new Headers(req.headers ?? {});
  if (req.body && !directHeaders.has('Content-Type')) {
    directHeaders.set('Content-Type', 'application/json');
  }
  const direct = await fetch(req.url, {
    method: req.method ?? 'GET',
    headers: directHeaders,
    body: req.body ? JSON.stringify(req.body) : undefined,
  });
  let data: unknown = null;
  const text = await direct.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: direct.status, ok: direct.ok, data };
}

function trimSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

function bearerHeaders(apiKey: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) h['Authorization'] = `Bearer ${apiKey}`;
  return h;
}

export interface GenerateResult {
  taskId: string;
  provider: MusicProviderId;
}

export interface PollResult {
  status: 'pending' | 'streaming' | 'complete' | 'failed';
  tracks: Array<{
    id: string;
    title?: string;
    audioUrl?: string;
    streamAudioUrl?: string;
    imageUrl?: string;
    videoUrl?: string;
    duration?: number;
    tags?: string;
    prompt?: string;
  }>;
  error?: string;
}

export async function generateMusic(
  config: MusicConfig,
  input: MusicGenerateInput,
): Promise<GenerateResult> {
  if (config.provider === 'acestep') {
    return generateAcestep(config, input);
  }
  // Default Suno-compatible flow (also used for `custom`).
  return generateSuno(config, input);
}

export async function pollMusic(
  config: MusicConfig,
  taskId: string,
): Promise<PollResult> {
  if (config.provider === 'acestep') {
    return pollAcestep(config, taskId);
  }
  return pollSuno(config, taskId);
}

// ---------------------------------------------------------------------------
// Suno-compatible (sunoapi.org and friends)
// ---------------------------------------------------------------------------

async function generateSuno(
  config: MusicConfig,
  input: MusicGenerateInput,
): Promise<GenerateResult> {
  const url = `${trimSlash(config.baseUrl)}/api/v1/generate`;
  const customMode = Boolean(input.customMode);
  // sunoapi.org expects { prompt, customMode, instrumental, model, style?,
  // title?, callBackUrl }. callBackUrl is required by their schema even
  // if we ignore it and poll instead — pass a harmless placeholder.
  const payload: Record<string, unknown> = {
    customMode,
    instrumental: Boolean(input.instrumental),
    model: input.model ?? config.model ?? 'V4',
    callBackUrl: 'https://example.com/no-op',
  };
  if (customMode) {
    // Custom mode wants the lyrics in `prompt` and the genre tags in `style`.
    payload.prompt = input.prompt;
    if (input.style) payload.style = input.style;
    if (input.title) payload.title = input.title;
  } else {
    // Simple mode: a single descriptive sentence in `prompt`.
    payload.prompt = input.prompt;
    if (input.title) payload.title = input.title;
  }

  const resp = await callProxy({
    url,
    method: 'POST',
    headers: bearerHeaders(config.apiKey),
    body: payload,
  });

  if (!resp.ok) {
    throw new Error(formatProviderError(resp.data, resp.status));
  }

  const data = resp.data as { code?: number; data?: { taskId?: string }; msg?: string };
  const taskId = data?.data?.taskId;
  if (!taskId) {
    throw new Error(data?.msg ? String(data.msg) : 'missing taskId in response');
  }
  return { taskId, provider: config.provider };
}

async function pollSuno(
  config: MusicConfig,
  taskId: string,
): Promise<PollResult> {
  const url =
    `${trimSlash(config.baseUrl)}/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`;
  const resp = await callProxy({
    url,
    method: 'GET',
    headers: bearerHeaders(config.apiKey),
  });

  if (!resp.ok) {
    throw new Error(formatProviderError(resp.data, resp.status));
  }

  const body = resp.data as {
    code?: number;
    msg?: string;
    data?: {
      status?: string;
      response?: { sunoData?: SunoTrackPayload[] };
      errorMessage?: string;
    };
  };
  const status = (body?.data?.status ?? 'PENDING').toUpperCase();
  const sunoData = body?.data?.response?.sunoData ?? [];
  const tracks = sunoData.map((t) => normaliseSunoTrack(t));

  if (status === 'SUCCESS' || status === 'TEXT_SUCCESS') {
    // TEXT_SUCCESS means lyrics/structure are ready but audio is still
    // rendering. We treat partial audioUrl entries as streaming.
    const allComplete = tracks.length > 0 && tracks.every((t) => t.audioUrl);
    return { status: allComplete ? 'complete' : 'streaming', tracks };
  }
  if (status === 'FIRST_SUCCESS') {
    return { status: 'streaming', tracks };
  }
  if (
    status === 'CREATE_TASK_FAILED' ||
    status === 'GENERATE_AUDIO_FAILED' ||
    status === 'CALLBACK_EXCEPTION' ||
    status === 'SENSITIVE_WORD_ERROR'
  ) {
    return {
      status: 'failed',
      tracks,
      error: body?.data?.errorMessage || body?.msg || status,
    };
  }
  return { status: 'pending', tracks };
}

interface SunoTrackPayload {
  id?: string;
  audioUrl?: string;
  audio_url?: string;
  streamAudioUrl?: string;
  stream_audio_url?: string;
  imageUrl?: string;
  image_url?: string;
  videoUrl?: string;
  video_url?: string;
  duration?: number;
  title?: string;
  prompt?: string;
  tags?: string;
}

function normaliseSunoTrack(t: SunoTrackPayload) {
  return {
    id: t.id ?? cryptoRandomId(),
    title: t.title,
    audioUrl: t.audioUrl ?? t.audio_url,
    streamAudioUrl: t.streamAudioUrl ?? t.stream_audio_url,
    imageUrl: t.imageUrl ?? t.image_url,
    videoUrl: t.videoUrl ?? t.video_url,
    duration: typeof t.duration === 'number' ? t.duration : undefined,
    tags: t.tags,
    prompt: t.prompt,
  };
}

// ---------------------------------------------------------------------------
// ACE-Step (local Gradio)
// ---------------------------------------------------------------------------

// ACE-Step exposes a Gradio API at `<baseUrl>/run/predict`. The full
// endpoint signature is messy and version-specific, so this is a narrow
// best-effort path: send the prompt, parse whatever audio URL comes back.
async function generateAcestep(
  config: MusicConfig,
  input: MusicGenerateInput,
): Promise<GenerateResult> {
  const url = `${trimSlash(config.baseUrl)}/run/predict`;
  const payload = {
    fn_index: 0,
    data: [
      input.prompt,
      input.style ?? '',
      input.instrumental ?? false,
      input.title ?? '',
    ],
    session_hash: cryptoRandomId(),
  };
  const resp = await callProxy({
    url,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  if (!resp.ok) {
    throw new Error(formatProviderError(resp.data, resp.status));
  }
  // ACE-Step's Gradio endpoint returns synchronously with the audio path
  // in `data`. We wrap it in a synthetic taskId so the polling loop stays
  // uniform with Suno.
  const taskId = cryptoRandomId();
  acestepCache.set(taskId, resp.data);
  return { taskId, provider: 'acestep' };
}

const acestepCache = new Map<string, unknown>();

function pollAcestep(_config: MusicConfig, taskId: string): Promise<PollResult> {
  const cached = acestepCache.get(taskId);
  if (!cached) {
    return Promise.resolve({ status: 'failed', tracks: [], error: 'unknown taskId' });
  }
  // Best-effort extraction — Gradio responses vary across builds. Look
  // for the first thing that smells like an audio URL.
  const audioUrl = findAudioUrl(cached);
  if (!audioUrl) {
    return Promise.resolve({
      status: 'failed',
      tracks: [],
      error: 'ACE-Step response did not contain an audio URL',
    });
  }
  return Promise.resolve({
    status: 'complete',
    tracks: [
      {
        id: taskId,
        audioUrl,
      },
    ],
  });
}

function findAudioUrl(value: unknown): string | undefined {
  if (typeof value === 'string') {
    if (/\.(mp3|wav|m4a|ogg|flac)/i.test(value)) return value;
    return undefined;
  }
  if (!value || typeof value !== 'object') return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findAudioUrl(item);
      if (found) return found;
    }
    return undefined;
  }
  for (const v of Object.values(value as Record<string, unknown>)) {
    const found = findAudioUrl(v);
    if (found) return found;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatProviderError(data: unknown, status: number): string {
  if (data && typeof data === 'object') {
    const obj = data as { msg?: unknown; error?: unknown; message?: unknown };
    const msg = obj.msg ?? obj.error ?? obj.message;
    if (typeof msg === 'string' && msg.length > 0) return msg;
  }
  if (typeof data === 'string' && data) return data;
  return `request failed (${status})`;
}

// Convenience: merge a provider PollResult into the persisted track shape.
export function mergePollIntoTracks(
  baseTrack: MusicTrack,
  poll: PollResult,
): MusicTrack[] {
  if (poll.tracks.length === 0) {
    return [
      {
        ...baseTrack,
        status: poll.status,
        ...(poll.error ? { error: poll.error } : {}),
      },
    ];
  }
  return poll.tracks.map((t, idx) => ({
    ...baseTrack,
    id: idx === 0 ? baseTrack.id : `${baseTrack.id}::${idx}`,
    title: t.title || baseTrack.title || `Track ${idx + 1}`,
    audioUrl: t.audioUrl ?? t.streamAudioUrl,
    imageUrl: t.imageUrl,
    videoUrl: t.videoUrl,
    duration: t.duration,
    style: t.tags ?? baseTrack.style,
    status: poll.status,
    ...(poll.error ? { error: poll.error } : {}),
  }));
}
