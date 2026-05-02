// Media-generation dispatcher. The unifying contract is:
//
//   skills + metadata + system-prompt
//        ↓ (the code agent decides what to make)
//   `od media generate --surface … --model … --output … --prompt …`
//        ↓ (this module routes to a provider)
//   bytes written to <projectsRoot>/<projectId>/<output>
//        ↓
//   FileViewer renders it.
//
// Every surface (image / video / audio) flows through this single
// entrypoint. Providers are pluggable: each file under ./media-providers/
// (or inline below) registers handlers keyed by (surface, model). The
// fallback handlers emit a deterministic, lightweight placeholder
// (labeled SVG-PNG, silent WAV/MP3, blank MP4) so the framework works
// without API keys — real provider integrations slot in later by
// replacing the handler.

import { mkdir, open, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  findMediaModel,
  findMediaModelForSurface,
  modelsForSurface,
} from './media-models.js';
import {
  ensureProject,
  kindFor,
  mimeFor,
  sanitizeName,
} from './projects.js';

const DEFAULT_OUTPUT_BY_SURFACE = {
  image: 'image.png',
  video: 'video.mp4',
  audio: 'audio.mp3',
};

const SURFACES = new Set(['image', 'video', 'audio']);
const AUDIO_KINDS = new Set(['music', 'speech', 'sfx']);

// Per-surface filename extension allowlist. The agent can pass --output with
// any of these and the dispatcher routes the right kind/mime back through
// FileViewer. Anything else (or a missing extension) is normalised to the
// surface default below; otherwise a stray --output poster.html on an image
// surface would land successfully but FileViewer would route it as HTML.
const ALLOWED_EXT_BY_SURFACE = {
  image: new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg']),
  video: new Set(['.mp4', '.m4v', '.webm', '.mov']),
  audio: new Set(['.mp3', '.wav', '.ogg', '.oga', '.m4a', '.flac', '.aac']),
};

const DEFAULT_EXT_BY_SURFACE = {
  image: '.png',
  video: '.mp4',
  audio: '.mp3',
};

// Defensive caps on agent-supplied strings. The /api/projects/:id/media/generate
// route also caps the JSON body via express.json's limit, but a runaway agent
// can still emit a 4MB prompt or output filename and we'd happily fan it out
// into the provider stub. Cap at module boundary so providers never see junk.
const MAX_PROMPT_LEN = 8000;
const MAX_OUTPUT_NAME_LEN = 200;
const MAX_VOICE_LEN = 200;
const MAX_FILENAME_COLLISION_TRIES = 100;

/**
 * Generate a media artifact and write it into the project's files dir.
 *
 * @param {Object} args
 * @param {string} args.projectsRoot - Absolute path to <repo>/.od/projects.
 * @param {string} args.projectId
 * @param {'image'|'video'|'audio'} args.surface
 * @param {string} args.model - Must be a registered model id for the surface.
 * @param {string} [args.prompt]
 * @param {string} [args.output] - Optional filename; auto-named if missing.
 * @param {string} [args.aspect] - 1:1 / 16:9 / 9:16 / 4:3 / 3:4
 * @param {number} [args.length] - Video length, seconds.
 * @param {number} [args.duration] - Audio duration, seconds.
 * @param {string} [args.voice]
 * @param {string} [args.audioKind] - music | speech | sfx
 * @returns {Promise<{ name: string, size: number, mtime: number, kind: string, mime: string, model: string, surface: string, providerNote: string }>}
 */
export async function generateMedia(args) {
  const {
    projectsRoot,
    projectId,
    surface,
    model,
    prompt,
    output,
    aspect,
    length,
    duration,
    voice,
    audioKind,
  } = args;

  if (!projectsRoot) throw new Error('projectsRoot required');
  if (typeof projectId !== 'string' || !projectId) {
    throw new Error('projectId required');
  }
  if (!SURFACES.has(surface)) {
    throw new Error(`unsupported surface: ${surface}`);
  }
  if (typeof model !== 'string' || !model) {
    throw new Error('model required');
  }
  if (surface === 'audio' && audioKind != null && !AUDIO_KINDS.has(audioKind)) {
    throw new Error(
      `unsupported audioKind: ${audioKind}. Use music | speech | sfx.`,
    );
  }

  // Cap agent-supplied strings so a runaway loop can't OOM the providers
  // (or the JSON parser at the route boundary) by sending megabyte-length
  // prompts. We reject rather than truncate so the agent gets a clear
  // error and re-plans.
  if (typeof prompt === 'string' && prompt.length > MAX_PROMPT_LEN) {
    throw new Error(`prompt too long: ${prompt.length} > ${MAX_PROMPT_LEN} chars`);
  }
  if (typeof output === 'string' && output.length > MAX_OUTPUT_NAME_LEN) {
    throw new Error(
      `output filename too long: ${output.length} > ${MAX_OUTPUT_NAME_LEN} chars`,
    );
  }
  if (typeof voice === 'string' && voice.length > MAX_VOICE_LEN) {
    throw new Error(`voice too long: ${voice.length} > ${MAX_VOICE_LEN} chars`);
  }

  // Surface-aware model validation. The previous implementation only
  // checked that the id existed in the global registry, which let an
  // agent pass `surface=image, model=suno-v5` and produce a stub PNG
  // routed through the audio renderer once a real provider lands. Now
  // we reject mismatches up-front with the list of valid model ids for
  // this exact (surface, audioKind) so the agent re-plans instead.
  const def = findMediaModelForSurface(model, surface, audioKind);
  if (!def) {
    if (!findMediaModel(model)) {
      throw new Error(
        `unknown model: ${model}. Pass --model from the registered list (see /api/media/models).`,
      );
    }
    const valid = modelsForSurface(surface, audioKind).map((m) => m.id);
    const where = surface === 'audio' ? `audio · ${audioKind || 'music'}` : surface;
    throw new Error(
      `model "${model}" is not valid for surface "${where}". Valid options: ${valid.join(', ')}.`,
    );
  }

  const dir = await ensureProject(projectsRoot, projectId);
  const requestedName = normaliseOutputForSurface(
    sanitizeName(output || autoOutputName(surface, model, audioKind)),
    surface,
  );
  await mkdir(dir, { recursive: true });

  const ctx = {
    surface,
    model,
    prompt: prompt || '',
    aspect: aspect || defaultAspectFor(surface),
    length: typeof length === 'number' ? length : undefined,
    duration: typeof duration === 'number' ? duration : undefined,
    voice: voice || '',
    audioKind: audioKind || (surface === 'audio' ? 'music' : undefined),
  };

  let bytes;
  let providerNote;
  if (surface === 'image') {
    ({ bytes, providerNote } = await renderImage(ctx, requestedName));
  } else if (surface === 'video') {
    ({ bytes, providerNote } = await renderVideo(ctx, requestedName));
  } else {
    ({ bytes, providerNote } = await renderAudio(ctx, requestedName));
  }

  // Atomic collision-safe write. If two concurrent `od media generate`
  // calls pick the same name in the same millisecond, exclusive-create
  // (`wx`) makes sure only one wins each slot — the loser sees EEXIST
  // and tries the next suffix. Replaces the prior check-then-write that
  // had a TOCTOU race in the millisecond between `pathExists` and
  // `writeFile`.
  const safeOut = await writeUniquely(dir, requestedName, bytes);
  const target = path.join(dir, safeOut);
  const st = await stat(target);
  return {
    name: safeOut,
    size: st.size,
    mtime: st.mtimeMs,
    kind: kindFor(safeOut),
    mime: mimeFor(safeOut),
    model,
    surface,
    providerNote,
  };
}

// Make sure the agent-supplied --output extension matches the requested
// surface. Otherwise the bytes land successfully but `kindFor`/`mimeFor`
// (which key off extension) route the file through the wrong viewer:
// `--surface image --output poster` would return kind=binary, and
// `--output poster.html` would return kind=html even though we wrote
// PNG/SVG bytes. Missing extensions get the surface default; mismatched
// extensions reject with a clear error so the agent re-plans rather
// than narrating "I generated poster.html" for a PNG payload.
function normaliseOutputForSurface(name, surface) {
  const allowed = ALLOWED_EXT_BY_SURFACE[surface];
  if (!allowed) return name;
  const ext = path.extname(name).toLowerCase();
  if (!ext) return name + DEFAULT_EXT_BY_SURFACE[surface];
  if (!allowed.has(ext)) {
    const list = [...allowed].join(', ');
    throw new Error(
      `output extension "${ext}" is not valid for surface "${surface}". Use one of: ${list}.`,
    );
  }
  return name;
}

function autoOutputName(surface, model, audioKind) {
  const base = DEFAULT_OUTPUT_BY_SURFACE[surface] || 'artifact.bin';
  const stamp = Date.now().toString(36);
  const tag = surface === 'audio' && audioKind ? `${audioKind}-${model}` : model;
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : '';
  return `${stem}-${tag}-${stamp}${ext}`;
}

function defaultAspectFor(surface) {
  if (surface === 'image') return '1:1';
  if (surface === 'video') return '16:9';
  return undefined;
}

// Atomic collision-safe write. Tries the requested name first via
// exclusive-create (`wx`); on EEXIST falls through to `name-2.ext`,
// `name-3.ext`, … each time exclusive-creating, so two concurrent
// callers can't both think the same slot is free. Returns the actual
// name written so the caller can echo it back to the agent.
async function writeUniquely(dir, name, bytes) {
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  for (let i = 1; i <= MAX_FILENAME_COLLISION_TRIES; i++) {
    const candidate = i === 1 ? name : `${stem}-${i}${ext}`;
    const written = await tryExclusiveWrite(path.join(dir, candidate), bytes);
    if (written) return candidate;
  }
  // Extreme fallback: append a base36 timestamp. Effectively never
  // collides; we only get here if 100 numbered variants already exist
  // AND the timestamp slot also races. The final write below is also
  // exclusive so we still cannot silently overwrite.
  const candidate = `${stem}-${Date.now().toString(36)}${ext}`;
  const written = await tryExclusiveWrite(path.join(dir, candidate), bytes);
  if (written) return candidate;
  throw new Error(`could not find a free filename slot for ${name}`);
}

async function tryExclusiveWrite(target, bytes) {
  let fh;
  try {
    fh = await open(target, 'wx');
  } catch (err) {
    if (err && err.code === 'EEXIST') return false;
    throw err;
  }
  try {
    await fh.writeFile(bytes);
  } finally {
    await fh.close();
  }
  return true;
}

// ---------------------------------------------------------------------------
// Provider stubs.
//
// Each renderer returns Buffer bytes that the caller writes to disk. They
// produce real, lightweight placeholder media labelled with the model +
// prompt so the user can verify which call was dispatched while the real
// provider integrations are still pending. To replace a stub with a real
// provider, swap the body — keep the (ctx, fileName) → { bytes, note }
// shape so server.js doesn't change.

async function renderImage(ctx, fileName) {
  // SVG-as-image: write SVG bytes into a .png filename only when ext is
  // svg; otherwise emit a tiny PNG that browsers can decode. We pick
  // PNG-as-bytes by encoding the SVG inside a minimal PNG container —
  // simpler: just write SVG XML into a .png, browsers can't render that.
  // So instead: for png/jpg, emit a deterministic 1×1 PNG; for svg, emit
  // a labelled SVG.
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.svg') {
    return { bytes: Buffer.from(svgPlaceholder(ctx), 'utf8'), providerNote: 'stub-svg' };
  }
  // Minimal 1×1 transparent PNG. Real provider would emit a full image.
  const png = Buffer.from(
    [
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ],
  );
  return {
    bytes: png,
    providerNote: `stub-png · model=${ctx.model} · aspect=${ctx.aspect} · prompt=${truncate(ctx.prompt, 60)}`,
  };
}

async function renderVideo(ctx, _fileName) {
  // Tiny but valid mp4 (ftyp + minimal moov). Browsers without a video
  // track will show 0 seconds, which is fine — this proves the dispatch
  // round-trip; real Seedance/Kling/Veo providers replace this body.
  const ftyp = Buffer.from([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
    0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
  ]);
  const mdat = Buffer.from([0x00, 0x00, 0x00, 0x08, 0x6d, 0x64, 0x61, 0x74]);
  return {
    bytes: Buffer.concat([ftyp, mdat]),
    providerNote: `stub-mp4 · model=${ctx.model} · aspect=${ctx.aspect} · length=${ctx.length ?? '?'}s · prompt=${truncate(ctx.prompt, 60)}`,
  };
}

async function renderAudio(ctx, fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.wav') {
    return {
      bytes: silentWav(0.5),
      providerNote: `stub-wav · model=${ctx.model} · kind=${ctx.audioKind} · duration=${ctx.duration ?? '?'}s`,
    };
  }
  // Default: emit a near-empty mp3 frame header so the file is valid but
  // tiny. Browsers may report 0:00; replace with real provider output.
  const mp3 = Buffer.from([
    0xff, 0xfb, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  return {
    bytes: mp3,
    providerNote: `stub-mp3 · model=${ctx.model} · kind=${ctx.audioKind} · voice=${ctx.voice || '-'} · duration=${ctx.duration ?? '?'}s`,
  };
}

function svgPlaceholder(ctx) {
  const [w, h] = aspectToBox(ctx.aspect, 800);
  const safe = (s) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`,
    `<rect width="${w}" height="${h}" fill="#0f1424"/>`,
    `<text x="50%" y="50%" fill="#7da4ff" font-family="ui-sans-serif" font-size="20" text-anchor="middle">${safe(ctx.model)} — ${safe(ctx.prompt).slice(0, 60)}</text>`,
    '</svg>',
  ].join('');
}

function aspectToBox(aspect, base) {
  const [a, b] = String(aspect || '1:1').split(':').map(Number);
  if (!a || !b) return [base, base];
  if (a >= b) return [base, Math.round((base * b) / a)];
  return [Math.round((base * a) / b), base];
}

function silentWav(seconds) {
  const sampleRate = 8000;
  const numSamples = Math.max(1, Math.round(sampleRate * seconds));
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

function truncate(s, n) {
  const v = String(s || '');
  if (v.length <= n) return v;
  return v.slice(0, n - 1) + '…';
}
