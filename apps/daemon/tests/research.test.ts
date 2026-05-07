import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { searchResearch, ResearchError } from '../src/research/index.js';

const RESEARCH_ENV_KEYS = [
  'OD_EXASEARCH_API_KEY',
  'EXASEARCH_API_KEY',
  'EXA_API_KEY',
  'OD_PERPLEXITY_API_KEY',
  'PERPLEXITY_API_KEY',
  'OD_TAVILY_API_KEY',
  'TAVILY_API_KEY',
  'OD_FINANCIAL_DATASETS_API_KEY',
  'FINANCIAL_DATASETS_API_KEY',
];

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

describe('research search', () => {
  const originalEnv = Object.fromEntries(
    RESEARCH_ENV_KEYS.map((key) => [key, process.env[key]]),
  );
  let projectRoot: string | null = null;

  beforeEach(() => {
    for (const key of RESEARCH_ENV_KEYS) delete process.env[key];
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    for (const key of RESEARCH_ENV_KEYS) {
      if (originalEnv[key] == null) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    const dir = projectRoot;
    projectRoot = null;
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function tempProjectRoot() {
    projectRoot = await mkdtemp(path.join(tmpdir(), 'od-research-project-'));
    return projectRoot;
  }

  function exaResponse() {
    return new Response(
      JSON.stringify({
        results: [
          {
            title: 'EV Exa report',
            url: 'https://example.com/exa-ev',
            text: 'Exa found EV market growth.',
            publishedDate: '2025-04-01T00:00:00.000Z',
          },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }

  function perplexityResponse() {
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: 'Perplexity says EV adoption is rising.',
            },
          },
        ],
        search_results: [
          {
            title: 'Perplexity EV report',
            url: 'https://example.com/perplexity-ev',
            snippet: 'Perplexity found EV market adoption.',
            date: '2025-04-02',
          },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }

  function tavilyResponse() {
    return new Response(
      JSON.stringify({
        answer: 'EV sales are growing.',
        results: [
          {
            title: 'EV report',
            url: 'https://example.com/ev',
            content: 'EV adoption increased in 2025.',
            published_date: '2025-05-01',
          },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }

  it('requires a configured web research provider key', async () => {
    await expect(
      searchResearch({ projectRoot: await tempProjectRoot(), query: 'EV trends' }),
    ).rejects.toMatchObject({
      code: 'WEB_RESEARCH_PROVIDER_KEY_MISSING',
      status: 400,
    } satisfies Partial<ResearchError>);
  });

  it('uses Exa first when an Exa key is configured', async () => {
    process.env.OD_EXASEARCH_API_KEY = 'exa-test';
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      exaResponse(),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'EV market 2025 trends',
      maxSources: 5,
    });

    expect(findings).toMatchObject({
      query: 'EV market 2025 trends',
      provider: 'exa',
      depth: 'shallow',
      sources: [
        {
          title: 'EV Exa report',
          url: 'https://example.com/exa-ev',
          snippet: 'Exa found EV market growth.',
          provider: 'exa',
          publishedAt: '2025-04-01T00:00:00.000Z',
        },
      ],
    });
    const [url, init] = fetchMock.mock.calls[0] as [FetchInput, FetchInit];
    expect(String(url)).toBe('https://api.exa.ai/search');
    expect((init!.headers as Record<string, string>)['x-api-key']).toBe('exa-test');
    expect(JSON.parse(String(init!.body))).toMatchObject({
      query: 'EV market 2025 trends',
      text: true,
      numResults: 5,
    });
  });

  it('uses Perplexity when Exa is not configured', async () => {
    process.env.PERPLEXITY_API_KEY = 'pplx-test';
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      perplexityResponse(),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'EV market 2025 trends',
    });

    expect(findings).toMatchObject({
      summary: 'Perplexity says EV adoption is rising.',
      provider: 'perplexity',
      sources: [
        {
          title: 'Perplexity EV report',
          url: 'https://example.com/perplexity-ev',
          snippet: 'Perplexity found EV market adoption.',
          provider: 'perplexity',
          publishedAt: '2025-04-02',
        },
      ],
    });
    const [url, init] = fetchMock.mock.calls[0] as [FetchInput, FetchInit];
    expect(String(url)).toBe('https://api.perplexity.ai/v1/sonar');
    expect((init!.headers as Record<string, string>).authorization).toBe(
      'Bearer pplx-test',
    );
    expect(JSON.parse(String(init!.body))).toMatchObject({
      model: 'sonar',
      messages: [{ role: 'user', content: 'EV market 2025 trends' }],
    });
  });

  it('uses shallow Tavily search and normalizes JSON findings', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      tavilyResponse(),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'EV market 2025 trends',
      maxSources: 50,
    });

    expect(findings).toMatchObject({
      query: 'EV market 2025 trends',
      summary: 'EV sales are growing.',
      provider: 'tavily',
      depth: 'shallow',
      sources: [
        {
          title: 'EV report',
          url: 'https://example.com/ev',
          snippet: 'EV adoption increased in 2025.',
          provider: 'tavily',
          publishedAt: '2025-05-01',
        },
      ],
    });
    const [url, init] = fetchMock.mock.calls[0] as [FetchInput, FetchInit];
    expect(String(url)).toBe('https://api.tavily.com/search');
    expect((init!.headers as Record<string, string>).authorization).toBe(
      'Bearer tvly-test',
    );
    const body = JSON.parse(String(init!.body));
    expect(body).toMatchObject({
      query: 'EV market 2025 trends',
      search_depth: 'basic',
      max_results: 20,
      include_answer: true,
      include_raw_content: false,
    });
  });

  it('falls back from a failing Exa request to configured Perplexity', async () => {
    process.env.EXASEARCH_API_KEY = 'exa-test';
    process.env.PERPLEXITY_API_KEY = 'pplx-test';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('bad exa key', { status: 401 }))
      .mockResolvedValueOnce(perplexityResponse());
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'EV market 2025 trends',
    });

    expect(findings.provider).toBe('perplexity');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]![0])).toBe('https://api.exa.ai/search');
    expect(String(fetchMock.mock.calls[1]![0])).toBe(
      'https://api.perplexity.ai/v1/sonar',
    );
  });

  it('preserves explicit supported provider order', async () => {
    process.env.EXASEARCH_API_KEY = 'exa-test';
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      tavilyResponse(),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'EV market 2025 trends',
      providers: ['tavily', 'exa'],
    });

    expect(findings.provider).toBe('tavily');
    const [url] = fetchMock.mock.calls[0] as [FetchInput, FetchInit];
    expect(String(url)).toBe('https://api.tavily.com/search');
  });

  it('returns a clear provider failure when every configured provider fails', async () => {
    process.env.EXASEARCH_API_KEY = 'exa-test';
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response('provider unavailable', { status: 503 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      searchResearch({
        projectRoot: await tempProjectRoot(),
        query: 'EV market 2025 trends',
      }),
    ).rejects.toMatchObject({
      code: 'RESEARCH_PROVIDER_FAILED',
      status: 502,
    } satisfies Partial<ResearchError>);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects Financial Datasets as unsupported for web research', async () => {
    process.env.FINANCIAL_DATASETS_API_KEY = 'financial-data-test';

    await expect(
      searchResearch({
        projectRoot: await tempProjectRoot(),
        query: 'AAPL revenue',
        providers: ['financialdatasets'],
      }),
    ).rejects.toMatchObject({
      code: 'UNSUPPORTED_RESEARCH_PROVIDER',
      status: 400,
    } satisfies Partial<ResearchError>);
  });
});
