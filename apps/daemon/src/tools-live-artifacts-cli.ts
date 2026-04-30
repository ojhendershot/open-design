import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

type JsonObject = Record<string, unknown>;

interface ToolCliResult {
  exitCode: number;
}

interface ParsedOptions {
  command: string | undefined;
  inputPath?: string;
  artifactId?: string;
  format: 'compact' | 'json';
  help: boolean;
}

const LIVE_ARTIFACTS_USAGE = `Usage:
  od tools live-artifacts create --input artifact.json
  od tools live-artifacts list [--format compact]
  od tools live-artifacts update --artifact-id <id> --input artifact.json

Environment:
  OD_DAEMON_URL   Daemon base URL injected into agent runs
  OD_TOOL_TOKEN   Bearer token injected into agent runs
`;

function writeJson(value: unknown, stream: NodeJS.WriteStream = process.stdout): void {
  stream.write(`${JSON.stringify(value)}\n`);
}

function fail(message: string, details?: unknown): ToolCliResult {
  writeJson({ ok: false, error: { message, ...(details === undefined ? {} : { details }) } }, process.stderr);
  return { exitCode: 1 };
}

function parseOptions(args: string[]): ParsedOptions | { error: string } {
  const [command, ...rest] = args;
  const options: ParsedOptions = {
    command: command === '-h' || command === '--help' ? undefined : command,
    format: 'compact',
    help: command === '-h' || command === '--help',
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === '--input') {
      const value = rest[++index];
      if (!value) return { error: '--input requires a file path' };
      options.inputPath = value;
    } else if (arg === '--artifact-id') {
      const value = rest[++index];
      if (!value) return { error: '--artifact-id requires an artifact id' };
      options.artifactId = value;
    } else if (arg === '--format') {
      const value = rest[++index];
      if (value !== 'compact' && value !== 'json') return { error: '--format must be compact or json' };
      options.format = value;
    } else if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else {
      return { error: `unknown option: ${arg}` };
    }
  }

  return options;
}

function daemonUrl(): URL | { error: string } {
  const rawUrl = process.env.OD_DAEMON_URL;
  if (!rawUrl) return { error: 'OD_DAEMON_URL is required' };
  try {
    const url = new URL(rawUrl);
    url.pathname = url.pathname.replace(/\/+$/u, '');
    url.search = '';
    url.hash = '';
    return url;
  } catch {
    return { error: 'OD_DAEMON_URL must be a valid URL' };
  }
}

function toolToken(): string | { error: string } {
  const token = process.env.OD_TOOL_TOKEN;
  if (!token) return { error: 'OD_TOOL_TOKEN is required' };
  return token;
}

function endpoint(baseUrl: URL, pathname: string): string {
  const url = new URL(baseUrl.toString());
  url.pathname = `${url.pathname}${pathname}`.replace(/\/+/gu, '/');
  return url.toString();
}

async function readJsonFile(filePath: string): Promise<unknown> {
  const text = await readFile(filePath, 'utf8');
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`invalid JSON in ${filePath}: ${message}`);
  }
}

async function readOptionalTextFile(filePath: string): Promise<string | undefined> {
  try {
    await access(filePath);
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return undefined;
    throw error;
  }
}

async function readOptionalJsonObject(filePath: string): Promise<JsonObject | undefined> {
  try {
    await access(filePath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return undefined;
    throw error;
  }
  const value = await readJsonFile(filePath);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${filePath} must contain a JSON object`);
  }
  return value as JsonObject;
}

async function readArtifactInput(inputPath: string): Promise<{ input: unknown; templateHtml?: string; provenanceJson?: JsonObject }> {
  const resolvedInputPath = path.resolve(inputPath);
  const input = await readJsonFile(resolvedInputPath);
  const inputDir = path.dirname(resolvedInputPath);
  const templateHtml = await readOptionalTextFile(path.join(inputDir, 'template.html'));
  const provenanceJson = await readOptionalJsonObject(path.join(inputDir, 'provenance.json'));
  return { input, ...(templateHtml === undefined ? {} : { templateHtml }), ...(provenanceJson === undefined ? {} : { provenanceJson }) };
}

async function requestJson(baseUrl: URL, token: string, pathname: string, init: RequestInit = {}): Promise<{ status: number; body: unknown }> {
  const response = await fetch(endpoint(baseUrl, pathname), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...init.headers,
    },
  });
  const text = await response.text();
  let body: unknown = text;
  if (text.length > 0) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = { message: text };
    }
  }
  return { status: response.status, body };
}

function compactArtifact(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const artifact = value as JsonObject;
  return {
    id: artifact.id,
    title: artifact.title,
    status: artifact.status,
    refreshStatus: artifact.refreshStatus,
    preview: artifact.preview,
    updatedAt: artifact.updatedAt,
  };
}

function compactList(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const response = value as JsonObject;
  const artifacts = Array.isArray(response.artifacts) ? response.artifacts : [];
  return {
    artifacts: artifacts.map(compactArtifact),
  };
}

function apiErrorBody(body: unknown): unknown {
  if (body && typeof body === 'object' && 'error' in body) return (body as JsonObject).error;
  return body;
}

async function printApiResult(response: { status: number; body: unknown }, compact: (body: unknown) => unknown): Promise<ToolCliResult> {
  if (response.status < 200 || response.status >= 300) {
    writeJson({ ok: false, status: response.status, error: apiErrorBody(response.body) }, process.stderr);
    return { exitCode: 1 };
  }
  writeJson({ ok: true, ...compact(response.body) as JsonObject });
  return { exitCode: 0 };
}

export async function runLiveArtifactsToolCli(args: string[]): Promise<ToolCliResult> {
  const options = parseOptions(args);
  if ('error' in options) return fail(options.error);
  if (options.help || !options.command) {
    process.stdout.write(LIVE_ARTIFACTS_USAGE);
    return { exitCode: options.command ? 0 : 1 };
  }

  const baseUrl = daemonUrl();
  if ('error' in baseUrl) return fail(baseUrl.error);
  const token = toolToken();
  if (typeof token !== 'string') return fail(token.error);

  try {
    if (options.command === 'create') {
      if (!options.inputPath) return fail('create requires --input artifact.json');
      const input = await readArtifactInput(options.inputPath);
      return await printApiResult(
        await requestJson(baseUrl, token, '/api/tools/live-artifacts/create', { method: 'POST', body: JSON.stringify(input) }),
        (body) => ({ artifact: compactArtifact((body as JsonObject).artifact) }),
      );
    }

    if (options.command === 'list') {
      return await printApiResult(
        await requestJson(baseUrl, token, '/api/tools/live-artifacts/list', { method: 'GET' }),
        options.format === 'compact' ? compactList : (body) => body,
      );
    }

    if (options.command === 'update') {
      if (!options.artifactId) return fail('update requires --artifact-id <id>');
      if (!options.inputPath) return fail('update requires --input artifact.json');
      const input = await readArtifactInput(options.inputPath);
      return await printApiResult(
        await requestJson(baseUrl, token, '/api/tools/live-artifacts/update', {
          method: 'POST',
          body: JSON.stringify({ artifactId: options.artifactId, ...input }),
        }),
        (body) => ({ artifact: compactArtifact((body as JsonObject).artifact) }),
      );
    }

    return fail(`unknown live-artifacts command: ${options.command}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fail(message);
  }
}
