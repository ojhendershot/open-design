// Langfuse trace forwarding for completed agent runs.
//
// This module is intentionally dependency-free (no `langfuse` SDK). It posts
// a {trace, generation} pair to Langfuse's public ingestion endpoint when a
// run reaches a terminal state. Without LANGFUSE_PUBLIC_KEY /
// LANGFUSE_SECRET_KEY in the env, every entry point becomes a no-op so that
// dev runs and forks of this open-source repo do not accidentally report.
//
// Privacy gates are layered: `prefs.metrics` is the master switch (off => no
// network call at all), `prefs.content` decides whether the prompt /
// assistant text is included, and `prefs.artifactManifest` decides whether
// the produced-files manifest is included. None of these defaults to true;
// the Web onboarding flow flips them after explicit consent.
//
// See: specs/change/20260507-langfuse-telemetry/spec.md

import { randomUUID } from 'node:crypto';

import type { TelemetryPrefs } from './app-config.js';

// Langfuse US region: confirmed by an end-to-end smoke on 2026-05-07 — the
// project's keys authenticate against `us.cloud.langfuse.com` only. EU host
// (`cloud.langfuse.com`) returns 401 with the matching error message.
// See specs/change/20260507-langfuse-telemetry/spec.md Q3.
const DEFAULT_BASE_URL = 'https://us.cloud.langfuse.com';

const INPUT_MAX_CHARS = 8 * 1024;
const OUTPUT_MAX_CHARS = 16 * 1024;
const ARTIFACTS_MAX_ITEMS = 50;
const SESSION_ID_MAX = 200; // Langfuse drops sessionIds longer than this.
const HARD_BATCH_MAX_BYTES = 1024 * 1024;
const FETCH_TIMEOUT_MS = 5000;

export interface LangfuseConfig {
  authHeader: string;
  baseUrl: string;
}

export interface RunSummary {
  runId: string;
  status: 'succeeded' | 'failed' | 'canceled';
  startedAt: number;
  endedAt: number;
  error?: string;
}

export interface MessageSummary {
  messageId: string;
  prompt: string;
  output: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface ArtifactSummary {
  slug: string;
  type: string;
  sizeBytes: number;
  sha256?: string;
  createdAt?: string;
}

export interface EventsSummary {
  toolCalls: number;
  errors: number;
  durationMs: number;
}

export interface ReportContext {
  installationId: string | null;
  projectId: string;
  conversationId: string;
  agentId?: string;
  run: RunSummary;
  message: MessageSummary;
  artifacts: ArtifactSummary[];
  eventsSummary: EventsSummary;
  prefs: TelemetryPrefs;
  extraTags?: string[];
}

export interface ReportRunOpts {
  config?: LangfuseConfig | null;
  fetchImpl?: typeof fetch;
}

export function readLangfuseConfig(
  env: NodeJS.ProcessEnv = process.env,
): LangfuseConfig | null {
  const publicKey = env.LANGFUSE_PUBLIC_KEY?.trim();
  const secretKey = env.LANGFUSE_SECRET_KEY?.trim();
  if (!publicKey || !secretKey) return null;
  const baseUrl = (env.LANGFUSE_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(
    /\/+$/,
    '',
  );
  const authHeader =
    'Basic ' +
    Buffer.from(`${publicKey}:${secretKey}`, 'utf8').toString('base64');
  return { authHeader, baseUrl };
}

function truncate(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined;
  return value.length > max ? value.slice(0, max) : value;
}

function buildTagList(ctx: ReportContext): string[] {
  const tags = ['open-design', `project:${ctx.projectId}`];
  if (ctx.agentId) tags.push(`agent:${ctx.agentId}`);
  if (ctx.extraTags?.length) tags.push(...ctx.extraTags);
  return tags;
}

export function buildTracePayload(ctx: ReportContext): unknown[] {
  const wantsContent = ctx.prefs.content === true;
  const wantsArtifacts = ctx.prefs.artifactManifest === true;

  const sessionId =
    ctx.conversationId.length <= SESSION_ID_MAX ? ctx.conversationId : undefined;

  const startTimeIso = new Date(ctx.run.startedAt).toISOString();
  const endTimeIso = new Date(ctx.run.endedAt).toISOString();
  const nowIso = new Date().toISOString();

  const inputText = wantsContent
    ? truncate(ctx.message.prompt, INPUT_MAX_CHARS)
    : undefined;
  const outputText = wantsContent
    ? truncate(ctx.message.output, OUTPUT_MAX_CHARS)
    : undefined;

  const artifactsList = wantsArtifacts
    ? ctx.artifacts.slice(0, ARTIFACTS_MAX_ITEMS)
    : undefined;
  const artifactsTruncated =
    wantsArtifacts && ctx.artifacts.length > ARTIFACTS_MAX_ITEMS
      ? true
      : undefined;

  const tokens = ctx.message.usage
    ? {
        input: ctx.message.usage.inputTokens,
        output: ctx.message.usage.outputTokens,
        total: ctx.message.usage.totalTokens,
      }
    : undefined;

  const usage = ctx.message.usage
    ? {
        input: ctx.message.usage.inputTokens,
        output: ctx.message.usage.outputTokens,
        total: ctx.message.usage.totalTokens,
        unit: 'TOKENS' as const,
      }
    : undefined;

  const success = ctx.run.status === 'succeeded';
  const traceId = ctx.run.runId;
  const generationId = `${ctx.run.runId}-gen`;

  return [
    {
      id: randomUUID(),
      type: 'trace-create',
      timestamp: nowIso,
      body: {
        id: traceId,
        name: 'open-design-turn',
        sessionId,
        userId: ctx.installationId ?? undefined,
        tags: buildTagList(ctx),
        input: inputText,
        output: outputText,
        metadata: {
          success,
          status: ctx.run.status,
          error: ctx.run.error ?? undefined,
          eventsSummary: ctx.eventsSummary,
          tokens,
          artifacts: artifactsList,
          artifactsTruncated,
        },
        timestamp: startTimeIso,
      },
    },
    {
      id: randomUUID(),
      type: 'generation-create',
      timestamp: nowIso,
      body: {
        id: generationId,
        traceId,
        name: 'llm',
        startTime: startTimeIso,
        endTime: endTimeIso,
        input: inputText,
        output: outputText,
        level: success ? 'DEFAULT' : 'ERROR',
        statusMessage: ctx.run.error ?? undefined,
        usage,
        metadata: {
          durationMs: ctx.eventsSummary.durationMs,
        },
      },
    },
  ];
}

async function postLangfuseBatch(
  config: LangfuseConfig,
  batch: unknown[],
  fetchImpl: typeof fetch,
): Promise<void> {
  try {
    const response = await fetchImpl(`${config.baseUrl}/api/public/ingestion`, {
      method: 'POST',
      headers: {
        Authorization: config.authHeader,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      body: JSON.stringify({ batch }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn(
        `[langfuse-trace] Ingestion failed ${response.status}: ${body.slice(0, 200)}`,
      );
    }
  } catch (error) {
    console.warn(`[langfuse-trace] Fetch error: ${String(error)}`);
  }
}

export async function reportRunCompleted(
  ctx: ReportContext,
  opts: ReportRunOpts = {},
): Promise<void> {
  if (ctx.prefs.metrics !== true) return;

  const config =
    opts.config !== undefined ? opts.config : readLangfuseConfig();
  if (!config) return;

  let batch: unknown[];
  try {
    batch = buildTracePayload(ctx);
  } catch (error) {
    console.warn(`[langfuse-trace] Payload build error: ${String(error)}`);
    return;
  }

  const serialized = JSON.stringify({ batch });
  if (serialized.length > HARD_BATCH_MAX_BYTES) {
    console.warn(
      `[langfuse-trace] Batch too large (${serialized.length}B > ${HARD_BATCH_MAX_BYTES}B), dropping trace ${ctx.run.runId}`,
    );
    return;
  }

  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  await postLangfuseBatch(config, batch, fetchImpl);
}
