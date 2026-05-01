// @ts-nocheck
import { afterEach, test } from 'vitest';
import assert from 'node:assert/strict';
import { AGENT_DEFS, buildLiveArtifactsMcpServersForAgent } from '../src/agents.js';
import { createLiveArtifactsMcpTools, handleLiveArtifactsMcpRequest } from '../src/mcp-live-artifacts-server.js';

const codex = AGENT_DEFS.find((agent) => agent.id === 'codex');
const hermes = AGENT_DEFS.find((agent) => agent.id === 'hermes');
const kimi = AGENT_DEFS.find((agent) => agent.id === 'kimi');
const cursorAgent = AGENT_DEFS.find((agent) => agent.id === 'cursor-agent');
const kiro = AGENT_DEFS.find((agent) => agent.id === 'kiro');
const originalDisablePlugins = process.env.OD_CODEX_DISABLE_PLUGINS;

afterEach(() => {
  if (originalDisablePlugins == null) {
    delete process.env.OD_CODEX_DISABLE_PLUGINS;
  } else {
    process.env.OD_CODEX_DISABLE_PLUGINS = originalDisablePlugins;
  }
});

test('codex args disable plugins when OD_CODEX_DISABLE_PLUGINS is 1', () => {
  process.env.OD_CODEX_DISABLE_PLUGINS = '1';

  const args = codex.buildArgs('', [], [], {}, { cwd: '/tmp/od-project' });

  assert.deepEqual(args.slice(0, 8), [
    'exec',
    '--json',
    '--skip-git-repo-check',
    '--full-auto',
    '-c',
    'sandbox_workspace_write.network_access=true',
    '--disable',
    'plugins',
  ]);
  assert.equal(args.at(-1), '-');
});

test('codex args keep plugins enabled when OD_CODEX_DISABLE_PLUGINS is unset', () => {
  delete process.env.OD_CODEX_DISABLE_PLUGINS;

  const args = codex.buildArgs('', [], [], {}, { cwd: '/tmp/od-project' });

  assert.equal(args.includes('--disable'), false);
  assert.equal(args.includes('plugins'), false);
  assert.equal(args.at(-1), '-');
});

test('codex args keep plugins enabled when OD_CODEX_DISABLE_PLUGINS is not 1', () => {
  process.env.OD_CODEX_DISABLE_PLUGINS = 'true';

  const args = codex.buildArgs('', [], [], {}, { cwd: '/tmp/od-project' });

  assert.equal(args.includes('--disable'), false);
  assert.equal(args.includes('plugins'), false);
  assert.equal(args.at(-1), '-');
});

test('live artifact MCP discovery is limited to mature ACP agents', () => {
  assert.deepEqual(buildLiveArtifactsMcpServersForAgent(hermes), [
    {
      name: 'open-design-live-artifacts',
      command: 'od',
      args: ['mcp', 'live-artifacts'],
    },
  ]);
  assert.deepEqual(buildLiveArtifactsMcpServersForAgent(kimi), [
    {
      name: 'open-design-live-artifacts',
      command: 'od',
      args: ['mcp', 'live-artifacts'],
    },
  ]);

  for (const agent of AGENT_DEFS) {
    if (agent.id === 'hermes' || agent.id === 'kimi') continue;
    assert.deepEqual(buildLiveArtifactsMcpServersForAgent(agent), []);
  }
});

test('live artifact MCP discovery is disabled when run-scoped tool auth is unavailable', () => {
  assert.deepEqual(buildLiveArtifactsMcpServersForAgent(hermes, { enabled: false }), []);
});

test('MCP-capable agents can discover equivalent live artifact and connector tools', async () => {
  const tools = createLiveArtifactsMcpTools();
  assert.deepEqual(tools.map((tool) => tool.name), [
    'live_artifacts_create',
    'live_artifacts_list',
    'live_artifacts_update',
    'live_artifacts_refresh',
    'connectors_list',
    'connectors_execute',
  ]);

  for (const tool of tools) {
    assert.equal(typeof tool.description, 'string');
    assert.match(tool.description, /Equivalent to `od tools /u);
    assert.equal(tool.inputSchema.type, 'object');
  }

  const initialized = await handleLiveArtifactsMcpRequest({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  assert.equal(initialized.result.serverInfo.name, 'open-design-live-artifacts');
  assert.deepEqual(initialized.result.capabilities, { tools: {} });

  const listed = await handleLiveArtifactsMcpRequest({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  assert.deepEqual(listed.result.tools.map((tool) => tool.name), tools.map((tool) => tool.name));
});

test('cursor-agent args deliver prompts via stdin without passing a literal dash prompt', () => {
  const args = cursorAgent.buildArgs('', [], [], {}, { cwd: '/tmp/od-project' });

  assert.deepEqual(args, [
    '--print',
    '--output-format',
    'stream-json',
    '--stream-partial-output',
    '--force',
    '--trust',
    '--workspace',
    '/tmp/od-project',
  ]);
});

test('kiro args use acp subcommand for json-rpc streaming', () => {
  const args = kiro.buildArgs('', [], [], {});

  assert.deepEqual(args, ['acp']);
  assert.equal(kiro.streamFormat, 'acp-json-rpc');
});

test('kiro fetchModels falls back to fallbackModels when detection fails', async () => {
  // fetchModels rejects when the binary doesn't exist; the daemon's
  // probe() catches this and uses fallbackModels instead.
  const result = await kiro.fetchModels('/nonexistent/kiro-cli').catch(() => null);

  assert.equal(result, null);
  assert.ok(Array.isArray(kiro.fallbackModels));
  assert.equal(kiro.fallbackModels[0].id, 'default');
});