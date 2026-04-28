import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { delimiter } from 'node:path';
import path from 'node:path';

const execFileP = promisify(execFile);

// Per-agent model picker:
//
//   - `models`             : selectable model presets shown in the UI. The
//                            first entry is treated as the default. `id`
//                            of `'default'` means "let the CLI pick" — the
//                            agent runs with no `--model` flag, so the
//                            user's local CLI config wins.
//   - `reasoningOptions`   : optional reasoning-effort presets (currently
//                            only Codex exposes this knob). Same `default`
//                            convention as models.
//   - `buildArgs(prompt, imagePaths, extraAllowedDirs, options)` returns
//     argv for the child process. `options = { model, reasoning }` carries
//     whatever the user picked in the model menu — agents that don't take a
//     model flag ignore them.
//
// `extraAllowedDirs` is a list of absolute directories the agent must be
// permitted to read files from (skill seeds, design-system specs) that live
// outside the project cwd. Currently only Claude Code wires this through
// (`--add-dir`); other agents either inherit broader access or run with cwd
// boundaries we can't widen via flags.
//
// `streamFormat` hints to the daemon how to interpret stdout:
//   - 'claude-stream-json' : line-delimited JSON emitted by Claude Code's
//     `--output-format stream-json`. Daemon parses it into typed events
//     (text / thinking / tool_use / tool_result / status) for the UI.
//   - 'plain' (default)    : raw text, forwarded chunk-by-chunk.
export const AGENT_DEFS = [
  {
    id: 'claude',
    name: 'Claude Code',
    bin: 'claude',
    versionArgs: ['--version'],
    models: [
      { id: 'default', label: 'Default (CLI config)' },
      { id: 'claude-opus-4-5', label: 'Opus 4.5' },
      { id: 'claude-sonnet-4-5', label: 'Sonnet 4.5' },
      { id: 'claude-haiku-4-5', label: 'Haiku 4.5' },
    ],
    buildArgs: (prompt, _imagePaths, extraAllowedDirs = [], options = {}) => {
      const args = [
        '-p',
        prompt,
        '--output-format',
        'stream-json',
        '--verbose',
        '--include-partial-messages',
      ];
      if (options.model && options.model !== 'default') {
        args.push('--model', options.model);
      }
      const dirs = (extraAllowedDirs || []).filter(
        (d) => typeof d === 'string' && d.length > 0,
      );
      if (dirs.length > 0) {
        args.push('--add-dir', ...dirs);
      }
      return args;
    },
    streamFormat: 'claude-stream-json',
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    bin: 'codex',
    versionArgs: ['--version'],
    models: [
      { id: 'default', label: 'Default (CLI config)' },
      { id: 'gpt-5-codex', label: 'gpt-5-codex' },
      { id: 'gpt-5', label: 'gpt-5' },
      { id: 'o3', label: 'o3' },
      { id: 'o4-mini', label: 'o4-mini' },
    ],
    reasoningOptions: [
      { id: 'default', label: 'Default' },
      { id: 'minimal', label: 'Minimal' },
      { id: 'low', label: 'Low' },
      { id: 'medium', label: 'Medium' },
      { id: 'high', label: 'High' },
    ],
    buildArgs: (prompt, _imagePaths, _extra, options = {}) => {
      const args = ['exec'];
      if (options.model && options.model !== 'default') {
        args.push('--model', options.model);
      }
      if (options.reasoning && options.reasoning !== 'default') {
        // Codex accepts `-c key=value` config overrides; reasoning effort
        // is exposed as `model_reasoning_effort`.
        args.push('-c', `model_reasoning_effort="${options.reasoning}"`);
      }
      args.push(prompt);
      return args;
    },
    streamFormat: 'plain',
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    bin: 'gemini',
    versionArgs: ['--version'],
    models: [
      { id: 'default', label: 'Default (CLI config)' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    ],
    buildArgs: (prompt, _imagePaths, _extra, options = {}) => {
      const args = [];
      if (options.model && options.model !== 'default') {
        args.push('--model', options.model);
      }
      args.push('-p', prompt);
      return args;
    },
    streamFormat: 'plain',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    bin: 'opencode',
    versionArgs: ['--version'],
    models: [
      { id: 'default', label: 'Default (CLI config)' },
      { id: 'anthropic/claude-sonnet-4-5', label: 'Anthropic · Sonnet 4.5' },
      { id: 'anthropic/claude-opus-4-5', label: 'Anthropic · Opus 4.5' },
      { id: 'anthropic/claude-haiku-4-5', label: 'Anthropic · Haiku 4.5' },
      { id: 'openai/gpt-5', label: 'OpenAI · gpt-5' },
      { id: 'google/gemini-2.5-pro', label: 'Google · Gemini 2.5 Pro' },
    ],
    buildArgs: (prompt, _imagePaths, _extra, options = {}) => {
      const args = ['run'];
      if (options.model && options.model !== 'default') {
        args.push('--model', options.model);
      }
      args.push(prompt);
      return args;
    },
    streamFormat: 'plain',
  },
  {
    id: 'cursor-agent',
    name: 'Cursor Agent',
    bin: 'cursor-agent',
    versionArgs: ['--version'],
    models: [
      { id: 'default', label: 'Default (CLI config)' },
      { id: 'auto', label: 'Auto' },
      { id: 'claude-4-sonnet', label: 'Claude 4 Sonnet' },
      { id: 'claude-4.5-sonnet', label: 'Claude 4.5 Sonnet' },
      { id: 'gpt-5', label: 'gpt-5' },
    ],
    buildArgs: (prompt, _imagePaths, _extra, options = {}) => {
      const args = [];
      if (options.model && options.model !== 'default') {
        args.push('--model', options.model);
      }
      args.push('-p', prompt);
      return args;
    },
    streamFormat: 'plain',
  },
  {
    id: 'qwen',
    name: 'Qwen Code',
    bin: 'qwen',
    versionArgs: ['--version'],
    models: [
      { id: 'default', label: 'Default (CLI config)' },
      { id: 'qwen3-coder-plus', label: 'qwen3-coder-plus' },
      { id: 'qwen3-coder-flash', label: 'qwen3-coder-flash' },
    ],
    buildArgs: (prompt, _imagePaths, _extra, options = {}) => {
      const args = [];
      if (options.model && options.model !== 'default') {
        args.push('--model', options.model);
      }
      args.push('-p', prompt);
      return args;
    },
    streamFormat: 'plain',
  },
];

function resolveOnPath(bin) {
  const exts =
    process.platform === 'win32'
      ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';')
      : [''];
  const dirs = (process.env.PATH || '').split(delimiter);
  for (const dir of dirs) {
    for (const ext of exts) {
      const full = path.join(dir, bin + ext);
      if (full && existsSync(full)) return full;
    }
  }
  return null;
}

async function probe(def) {
  const resolved = resolveOnPath(def.bin);
  if (!resolved) return { ...stripFns(def), available: false };
  let version = null;
  try {
    const { stdout } = await execFileP(resolved, def.versionArgs, { timeout: 3000 });
    version = stdout.trim().split('\n')[0];
  } catch {
    // binary exists but --version failed; still mark available
  }
  return { ...stripFns(def), available: true, path: resolved, version };
}

function stripFns(def) {
  // Drop the buildArgs closure but keep declarative metadata (models,
  // reasoningOptions, streamFormat) so the frontend can render the picker
  // without a second round-trip.
  const { buildArgs, ...rest } = def;
  return rest;
}

export async function detectAgents() {
  return Promise.all(AGENT_DEFS.map(probe));
}

export function getAgentDef(id) {
  return AGENT_DEFS.find((a) => a.id === id) || null;
}
