import type { ResearchSource } from '@open-design/contracts/api/research';

const DEFAULT_BASE_URL = 'https://api.exa.ai';
const DEFAULT_TIMEOUT_MS = 30_000;
const EXA_MAX_RESULTS_LIMIT = 20;

export interface ExaSearchInput {
  apiKey: string;
  baseUrl?: string;
  query: string;
  maxResults?: number;
  signal?: AbortSignal;
}

interface ExaRawResult {
  title?: unknown;
  url?: unknown;
  text?: unknown;
  summary?: unknown;
  publishedDate?: unknown;
  published_date?: unknown;
}

interface ExaRawResponse {
  results?: unknown;
}

export interface ExaSearchOutput {
  answer: string;
  sources: ResearchSource[];
}

export class ExaError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ExaError';
  }
}

export async function exaSearch(input: ExaSearchInput): Promise<ExaSearchOutput> {
  if (!input.apiKey) {
    throw new ExaError('Exa API key is not configured');
  }
  const base = (input.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const requestedMax = input.maxResults ?? 5;
  const maxResults = Math.max(0, Math.min(requestedMax, EXA_MAX_RESULTS_LIMIT));
  const body = {
    query: input.query,
    text: true,
    numResults: maxResults,
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS);
  if (input.signal) {
    input.signal.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  let resp: Response;
  try {
    resp = await fetch(`${base}/search`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': input.apiKey,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (err) {
    throw new ExaError(
      `Exa request failed: ${(err as Error).message || String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new ExaError(
      `Exa ${resp.status}: ${text.slice(0, 200) || 'no body'}`,
      resp.status,
    );
  }
  const json = (await resp.json()) as ExaRawResponse;
  const rawResults = Array.isArray(json.results) ? json.results : [];
  const sources: ResearchSource[] = [];
  for (const r of rawResults as ExaRawResult[]) {
    const url = typeof r.url === 'string' ? r.url : '';
    if (!url) continue;
    const publishedAt =
      typeof r.publishedDate === 'string' && r.publishedDate.trim()
        ? r.publishedDate.trim()
        : typeof r.published_date === 'string' && r.published_date.trim()
          ? r.published_date.trim()
          : null;
    const snippet =
      typeof r.summary === 'string' && r.summary.trim()
        ? r.summary.trim()
        : typeof r.text === 'string'
          ? r.text.trim().slice(0, 800)
          : '';
    sources.push({
      title:
        typeof r.title === 'string' && r.title.trim()
          ? r.title.trim()
          : url,
      url,
      snippet,
      provider: 'exa',
      ...(publishedAt ? { publishedAt } : {}),
    });
  }
  return { answer: '', sources };
}
