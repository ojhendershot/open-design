import type {
  ResearchDepth,
  ResearchFindings,
  ResearchSource,
} from '@open-design/contracts/api/research';
import { resolveProviderConfig } from '../media-config.js';
import { exaSearch, ExaError } from './exa.js';
import { perplexitySearch, PerplexityError } from './perplexity.js';
import { tavilySearch, TavilyError } from './tavily.js';

const DEFAULT_MAX_SOURCES = 5;
const TAVILY_MAX_RESULTS_LIMIT = 20;
const WEB_RESEARCH_PROVIDER_ORDER = ['exa', 'perplexity', 'tavily'] as const;
type WebResearchProvider = (typeof WEB_RESEARCH_PROVIDER_ORDER)[number];

export class ResearchError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = 'RESEARCH_FAILED',
  ) {
    super(message);
    this.name = 'ResearchError';
  }
}

export interface SearchResearchInput {
  query: string;
  projectRoot: string;
  maxSources?: number;
  providers?: string[];
  signal?: AbortSignal;
}

export async function searchResearch(
  input: SearchResearchInput,
): Promise<ResearchFindings> {
  const query = (input.query?.trim() || '').slice(0, 1000);
  if (!query) {
    throw new ResearchError('query required', 400, 'QUERY_REQUIRED');
  }
  const depth: ResearchDepth = 'shallow';
  const providers = resolveProviderOrder(input.providers);
  const maxSources = clampMaxSources(input.maxSources);
  const providerErrors: string[] = [];
  let sawConfiguredProvider = false;

  for (const provider of providers) {
    const cfg = await resolveProviderConfig(input.projectRoot, provider);
    if (!cfg.apiKey) continue;
    sawConfiguredProvider = true;
    try {
      const out = await runProviderSearch(provider, {
        apiKey: cfg.apiKey,
        baseUrl: cfg.baseUrl,
        query,
        maxSources,
        ...(input.signal ? { signal: input.signal } : {}),
      });
      if (out.sources.length === 0) {
        providerErrors.push(`${provider}: no sources found`);
        continue;
      }
      return {
        query,
        summary: out.answer || synthesizeFallbackSummary(out.sources),
        sources: out.sources,
        provider,
        depth,
        fetchedAt: Date.now(),
      };
    } catch (err) {
      providerErrors.push(`${provider}: ${providerErrorMessage(err)}`);
    }
  }

  if (!sawConfiguredProvider) {
    throw new ResearchError(
      'No web research provider API key configured (configure Exa, Perplexity, or Tavily in Settings -> Media providers)',
      400,
      'WEB_RESEARCH_PROVIDER_KEY_MISSING',
    );
  }
  throw new ResearchError(
    `All configured web research providers failed: ${providerErrors.join('; ')}`,
    502,
    'RESEARCH_PROVIDER_FAILED',
  );
}

function resolveProviderOrder(providers: unknown): WebResearchProvider[] {
  const requested = Array.isArray(providers)
    ? providers.filter(
        (p: unknown): p is string => typeof p === 'string' && p.trim().length > 0,
      )
    : [];
  const order = requested.length > 0 ? requested : WEB_RESEARCH_PROVIDER_ORDER;
  const resolved: WebResearchProvider[] = [];
  for (const raw of order) {
    const provider = raw.trim().toLowerCase();
    if (provider === 'financialdatasets') {
      throw new ResearchError(
        'Financial Datasets is not a web search provider; use Exa, Perplexity, or Tavily for research search',
        400,
        'UNSUPPORTED_RESEARCH_PROVIDER',
      );
    }
    if (!isWebResearchProvider(provider)) {
      throw new ResearchError(
        `provider "${raw}" not supported for web research`,
        400,
        'UNSUPPORTED_RESEARCH_PROVIDER',
      );
    }
    if (!resolved.includes(provider)) resolved.push(provider);
  }
  return resolved;
}

function isWebResearchProvider(value: string): value is WebResearchProvider {
  return (WEB_RESEARCH_PROVIDER_ORDER as readonly string[]).includes(value);
}

async function runProviderSearch(
  provider: WebResearchProvider,
  input: {
    apiKey: string;
    baseUrl?: string;
    query: string;
    maxSources: number;
    signal?: AbortSignal;
  },
): Promise<{ answer: string; sources: ResearchSource[] }> {
  if (provider === 'exa') {
    return exaSearch({
      apiKey: input.apiKey,
      query: input.query,
      maxResults: input.maxSources,
      ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
      ...(input.signal ? { signal: input.signal } : {}),
    });
  }
  if (provider === 'perplexity') {
    return perplexitySearch({
      apiKey: input.apiKey,
      query: input.query,
      maxResults: input.maxSources,
      ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
      ...(input.signal ? { signal: input.signal } : {}),
    });
  }
  return tavilySearch({
    apiKey: input.apiKey,
    query: input.query,
    searchDepth: 'basic',
    maxResults: input.maxSources,
    includeAnswer: true,
    ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
    ...(input.signal ? { signal: input.signal } : {}),
  });
}

function providerErrorMessage(err: unknown): string {
  if (
    err instanceof ExaError ||
    err instanceof PerplexityError ||
    err instanceof TavilyError
  ) {
    return err.message;
  }
  return (err as Error).message || String(err);
}

function synthesizeFallbackSummary(sources: ResearchSource[]): string {
  const lead = sources
    .slice(0, 5)
    .map((s, i) => `- [${i + 1}] ${s.title}: ${s.snippet.slice(0, 200)}`)
    .join('\n');
  return `(No provider summary; top snippets follow.)\n${lead}`;
}

function clampMaxSources(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_MAX_SOURCES;
  }
  return Math.max(1, Math.min(Math.floor(value), TAVILY_MAX_RESULTS_LIMIT));
}
