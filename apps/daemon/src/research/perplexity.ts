import type { ResearchSource } from '@open-design/contracts/api/research';

const DEFAULT_BASE_URL = 'https://api.perplexity.ai';
const DEFAULT_TIMEOUT_MS = 30_000;
const PERPLEXITY_MAX_RESULTS_LIMIT = 20;

export interface PerplexitySearchInput {
  apiKey: string;
  baseUrl?: string;
  query: string;
  maxResults?: number;
  signal?: AbortSignal;
}

interface PerplexityRawSearchResult {
  title?: unknown;
  url?: unknown;
  snippet?: unknown;
  date?: unknown;
  last_updated?: unknown;
}

interface PerplexityRawResponse {
  choices?: unknown;
  citations?: unknown;
  search_results?: unknown;
}

export interface PerplexitySearchOutput {
  answer: string;
  sources: ResearchSource[];
}

export class PerplexityError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'PerplexityError';
  }
}

export async function perplexitySearch(
  input: PerplexitySearchInput,
): Promise<PerplexitySearchOutput> {
  if (!input.apiKey) {
    throw new PerplexityError('Perplexity API key is not configured');
  }
  const base = (input.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const maxResults = Math.max(
    0,
    Math.min(input.maxResults ?? 5, PERPLEXITY_MAX_RESULTS_LIMIT),
  );
  const body = {
    model: 'sonar',
    messages: [{ role: 'user', content: input.query }],
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS);
  if (input.signal) {
    input.signal.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  let resp: Response;
  try {
    resp = await fetch(`${base}/v1/sonar`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (err) {
    throw new PerplexityError(
      `Perplexity request failed: ${(err as Error).message || String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new PerplexityError(
      `Perplexity ${resp.status}: ${text.slice(0, 200) || 'no body'}`,
      resp.status,
    );
  }
  const json = (await resp.json()) as PerplexityRawResponse;
  const answer = extractAnswer(json);
  const rawSearchResults = Array.isArray(json.search_results)
    ? json.search_results
    : [];
  const sources = normalizeSearchResults(rawSearchResults, maxResults);
  if (sources.length > 0) {
    return { answer, sources };
  }

  const citations = Array.isArray(json.citations) ? json.citations : [];
  return {
    answer,
    sources: citations
      .filter(
        (value): value is string =>
          typeof value === 'string' && value.trim().length > 0,
      )
      .slice(0, maxResults)
      .map((url) => ({
        title: url,
        url,
        snippet: '',
        provider: 'perplexity',
      })),
  };
}

function extractAnswer(json: PerplexityRawResponse): string {
  if (!Array.isArray(json.choices)) return '';
  for (const choice of json.choices) {
    if (!choice || typeof choice !== 'object') continue;
    const message = (choice as { message?: unknown }).message;
    if (!message || typeof message !== 'object') continue;
    const content = (message as { content?: unknown }).content;
    if (typeof content === 'string' && content.trim()) return content.trim();
  }
  return '';
}

function normalizeSearchResults(
  rawSearchResults: unknown[],
  maxResults: number,
): ResearchSource[] {
  const sources: ResearchSource[] = [];
  for (const r of rawSearchResults as PerplexityRawSearchResult[]) {
    const url = typeof r.url === 'string' ? r.url : '';
    if (!url) continue;
    const publishedAt =
      typeof r.date === 'string' && r.date.trim()
        ? r.date.trim()
        : typeof r.last_updated === 'string' && r.last_updated.trim()
          ? r.last_updated.trim()
          : null;
    sources.push({
      title:
        typeof r.title === 'string' && r.title.trim()
          ? r.title.trim()
          : url,
      url,
      snippet:
        typeof r.snippet === 'string'
          ? r.snippet.trim().slice(0, 800)
          : '',
      provider: 'perplexity',
      ...(publishedAt ? { publishedAt } : {}),
    });
    if (sources.length >= maxResults) break;
  }
  return sources;
}
