import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildTracePayload,
  readLangfuseConfig,
  reportRunCompleted,
  type LangfuseConfig,
  type ReportContext,
} from '../src/langfuse-trace.js';

function makeCtx(overrides: Partial<ReportContext> = {}): ReportContext {
  const base: ReportContext = {
    installationId: 'install-uuid-1',
    projectId: 'proj-1',
    conversationId: 'conv-uuid-aaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    agentId: 'claude',
    run: {
      runId: 'run-1',
      status: 'succeeded',
      startedAt: 1_700_000_000_000,
      endedAt: 1_700_000_004_500,
    },
    message: {
      messageId: 'msg-1',
      prompt: 'Make a landing page for a coffee shop.',
      output: 'Here is a landing page draft …',
      usage: {
        inputTokens: 1234,
        outputTokens: 567,
        totalTokens: 1801,
      },
    },
    artifacts: [],
    eventsSummary: { toolCalls: 4, errors: 0, durationMs: 4500 },
    prefs: { metrics: true, content: false, artifactManifest: false },
  };
  return { ...base, ...overrides };
}

const TEST_CONFIG: LangfuseConfig = {
  authHeader: 'Basic dGVzdA==',
  baseUrl: 'https://us.cloud.langfuse.com',
};

describe('readLangfuseConfig', () => {
  it('returns null when keys are missing', () => {
    expect(readLangfuseConfig({})).toBeNull();
    expect(readLangfuseConfig({ LANGFUSE_PUBLIC_KEY: 'pk' })).toBeNull();
    expect(readLangfuseConfig({ LANGFUSE_SECRET_KEY: 'sk' })).toBeNull();
  });

  it('returns null when keys are whitespace-only', () => {
    expect(
      readLangfuseConfig({
        LANGFUSE_PUBLIC_KEY: '   ',
        LANGFUSE_SECRET_KEY: 'sk',
      }),
    ).toBeNull();
  });

  it('builds Basic auth header from public:secret', () => {
    const cfg = readLangfuseConfig({
      LANGFUSE_PUBLIC_KEY: 'pk-lf-abc',
      LANGFUSE_SECRET_KEY: 'sk-lf-xyz',
    });
    expect(cfg).not.toBeNull();
    const expected =
      'Basic ' + Buffer.from('pk-lf-abc:sk-lf-xyz').toString('base64');
    expect(cfg!.authHeader).toBe(expected);
  });

  it('uses default US base URL when LANGFUSE_BASE_URL is absent', () => {
    const cfg = readLangfuseConfig({
      LANGFUSE_PUBLIC_KEY: 'pk',
      LANGFUSE_SECRET_KEY: 'sk',
    });
    expect(cfg!.baseUrl).toBe('https://us.cloud.langfuse.com');
  });

  it('honours LANGFUSE_BASE_URL and strips trailing slashes', () => {
    const cfg = readLangfuseConfig({
      LANGFUSE_PUBLIC_KEY: 'pk',
      LANGFUSE_SECRET_KEY: 'sk',
      LANGFUSE_BASE_URL: 'https://cloud.langfuse.com//',
    });
    expect(cfg!.baseUrl).toBe('https://cloud.langfuse.com');
  });
});

describe('buildTracePayload', () => {
  it('emits a trace-create + generation-create pair', () => {
    const batch = buildTracePayload(makeCtx());
    expect(batch).toHaveLength(2);
    const types = (batch as Array<{ type: string }>).map((e) => e.type);
    expect(types).toEqual(['trace-create', 'generation-create']);
  });

  it('omits prompt + output when content gate is off', () => {
    const batch = buildTracePayload(makeCtx());
    const trace = (batch[0] as any).body;
    const gen = (batch[1] as any).body;
    expect(trace.input).toBeUndefined();
    expect(trace.output).toBeUndefined();
    expect(gen.input).toBeUndefined();
    expect(gen.output).toBeUndefined();
  });

  it('includes prompt + output when content gate is on', () => {
    const batch = buildTracePayload(
      makeCtx({
        prefs: { metrics: true, content: true, artifactManifest: false },
      }),
    );
    const trace = (batch[0] as any).body;
    expect(trace.input).toMatch(/coffee shop/);
    expect(trace.output).toMatch(/landing page draft/);
  });

  it('truncates prompt at 8 KB and output at 16 KB', () => {
    const longPrompt = 'a'.repeat(20_000);
    const longOutput = 'b'.repeat(40_000);
    const batch = buildTracePayload(
      makeCtx({
        message: {
          messageId: 'msg-1',
          prompt: longPrompt,
          output: longOutput,
        },
        prefs: { metrics: true, content: true, artifactManifest: false },
      }),
    );
    const trace = (batch[0] as any).body;
    expect(trace.input.length).toBe(8 * 1024);
    expect(trace.output.length).toBe(16 * 1024);
  });

  it('omits artifacts when manifest gate is off', () => {
    const batch = buildTracePayload(
      makeCtx({
        artifacts: [
          { slug: 'a', type: 'html', sizeBytes: 100 },
          { slug: 'b', type: 'jsx', sizeBytes: 200 },
        ],
      }),
    );
    const trace = (batch[0] as any).body;
    expect(trace.metadata.artifacts).toBeUndefined();
    expect(trace.metadata.artifactsTruncated).toBeUndefined();
  });

  it('caps artifacts at 50 entries with a truncation flag', () => {
    const many = Array.from({ length: 75 }, (_, i) => ({
      slug: `art-${i}`,
      type: 'html',
      sizeBytes: 1,
    }));
    const batch = buildTracePayload(
      makeCtx({
        artifacts: many,
        prefs: { metrics: true, content: false, artifactManifest: true },
      }),
    );
    const trace = (batch[0] as any).body;
    expect(trace.metadata.artifacts).toHaveLength(50);
    expect(trace.metadata.artifactsTruncated).toBe(true);
  });

  it('keeps eventsSummary metadata regardless of content / artifact gates', () => {
    const batch = buildTracePayload(makeCtx());
    const trace = (batch[0] as any).body;
    expect(trace.metadata.eventsSummary).toEqual({
      toolCalls: 4,
      errors: 0,
      durationMs: 4500,
    });
  });

  it('records token counts in metadata.tokens and generation.usage', () => {
    const batch = buildTracePayload(makeCtx());
    const trace = (batch[0] as any).body;
    const gen = (batch[1] as any).body;
    expect(trace.metadata.tokens).toEqual({
      input: 1234,
      output: 567,
      total: 1801,
    });
    expect(gen.usage).toEqual({
      input: 1234,
      output: 567,
      total: 1801,
      unit: 'TOKENS',
    });
  });

  it('uses conversationId as sessionId when within length limit', () => {
    const batch = buildTracePayload(makeCtx());
    expect((batch[0] as any).body.sessionId).toBe(
      'conv-uuid-aaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    );
  });

  it('drops sessionId when conversationId exceeds 200 chars', () => {
    const batch = buildTracePayload(
      makeCtx({ conversationId: 'x'.repeat(201) }),
    );
    expect((batch[0] as any).body.sessionId).toBeUndefined();
  });

  it('builds tag list with project + agent + extras', () => {
    const batch = buildTracePayload(
      makeCtx({ extraTags: ['skill:landing-page'] }),
    );
    expect((batch[0] as any).body.tags).toEqual([
      'open-design',
      'project:proj-1',
      'agent:claude',
      'skill:landing-page',
    ]);
  });

  it('marks generation.level=ERROR when run failed', () => {
    const batch = buildTracePayload(
      makeCtx({
        run: {
          runId: 'run-1',
          status: 'failed',
          startedAt: 1,
          endedAt: 2,
          error: 'boom',
        },
      }),
    );
    const gen = (batch[1] as any).body;
    expect(gen.level).toBe('ERROR');
    expect(gen.statusMessage).toBe('boom');
    expect((batch[0] as any).body.metadata.error).toBe('boom');
    expect((batch[0] as any).body.metadata.success).toBe(false);
  });

  it('passes through anonymous installationId as userId', () => {
    const batch = buildTracePayload(makeCtx({ installationId: null }));
    expect((batch[0] as any).body.userId).toBeUndefined();
  });
});

describe('reportRunCompleted', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('does nothing when metrics gate is off', async () => {
    const fetchSpy = vi.fn();
    await reportRunCompleted(
      makeCtx({
        prefs: { metrics: false, content: true, artifactManifest: true },
      }),
      { config: TEST_CONFIG, fetchImpl: fetchSpy as any },
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does nothing when no Langfuse config is available', async () => {
    const fetchSpy = vi.fn();
    await reportRunCompleted(makeCtx(), {
      config: null,
      fetchImpl: fetchSpy as any,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('POSTs to /api/public/ingestion with Basic auth and a JSON batch body', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response('{}', { status: 200 }),
    );
    await reportRunCompleted(makeCtx(), {
      config: TEST_CONFIG,
      fetchImpl: fetchSpy as any,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const call = fetchSpy.mock.calls[0]!;
    const url = call[0] as string;
    const init = call[1] as RequestInit & { headers: Record<string, string> };
    expect(url).toBe('https://us.cloud.langfuse.com/api/public/ingestion');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Basic dGVzdA==');
    expect(init.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(init.body as string);
    expect(Array.isArray(body.batch)).toBe(true);
    expect(body.batch).toHaveLength(2);
  });

  it('warns and drops when serialized batch exceeds the hard cap', async () => {
    // Per-field truncation already caps prompt/output, so we overflow the
    // hard cap by stuffing 50 artifact entries with very long slugs while
    // artifactManifest is on (50 × 30 KB ≈ 1.5 MB > 1 MB cap).
    const fetchSpy = vi.fn();
    const fatArtifacts = Array.from({ length: 50 }, (_, i) => ({
      slug: 'a'.repeat(30_000) + i,
      type: 'html',
      sizeBytes: 1,
    }));
    await reportRunCompleted(
      makeCtx({
        artifacts: fatArtifacts,
        prefs: { metrics: true, content: false, artifactManifest: true },
      }),
      { config: TEST_CONFIG, fetchImpl: fetchSpy as any },
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Batch too large'),
    );
  });

  it('only warns (does not throw) when fetch rejects', async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error('network down'));
    await expect(
      reportRunCompleted(makeCtx(), {
        config: TEST_CONFIG,
        fetchImpl: fetchSpy as any,
      }),
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Fetch error'),
    );
  });

  it('only warns (does not throw) when ingestion responds non-2xx', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response('rate limited', { status: 429 }),
    );
    await reportRunCompleted(makeCtx(), {
      config: TEST_CONFIG,
      fetchImpl: fetchSpy as any,
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Ingestion failed 429'),
    );
  });
});
