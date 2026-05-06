import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CONFIG,
  loadConfig,
  mergeDaemonConfigPrefs,
  syncComposioConfigToDaemon,
  syncConfigToDaemon,
} from '../../src/state/config';
import type { AppConfig } from '../../src/types';

const store = new Map<string, string>();
const originalFetch = globalThis.fetch;

vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    store.delete(key);
  }),
  clear: vi.fn(() => {
    store.clear();
  }),
});

describe('syncComposioConfigToDaemon', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', originalFetch);
  });

  it('sends a pending Composio API key to the daemon', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await syncComposioConfigToDaemon({ apiKey: 'cmp_secret', apiKeyConfigured: false });

    expect(fetchMock).toHaveBeenCalledWith('/api/connectors/composio/config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ apiKey: 'cmp_secret' }),
    });
  });

  it('does not clear a daemon-saved key when local state only has the saved marker', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await syncComposioConfigToDaemon({ apiKey: '', apiKeyConfigured: true, apiKeyTail: 'test' });

    expect(fetchMock).toHaveBeenCalledWith('/api/connectors/composio/config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
  });
});

describe('syncConfigToDaemon', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', originalFetch);
  });

  it('persists non-secret execution settings to the daemon', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await syncConfigToDaemon({
      ...DEFAULT_CONFIG,
      mode: 'api',
      apiKey: 'sk-secret',
      baseUrl: 'https://api.example.com/v1',
      model: 'example-model',
      apiProtocol: 'openai',
      apiVersion: '2024-10-21',
      apiProviderBaseUrl: null,
      apiProtocolConfigs: {
        openai: {
          apiKey: 'sk-protocol-secret',
          baseUrl: 'https://api.example.com/v1',
          model: 'example-model',
        },
      },
      mediaProviders: { openai: { apiKey: 'media-secret', baseUrl: '' } },
      composio: { apiKey: 'composio-secret' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestInit = (fetchMock.mock.calls as unknown as [string, RequestInit][])[0]![1];
    const body = JSON.parse(requestInit.body as string);
    expect(body).toMatchObject({
      onboardingCompleted: false,
      mode: 'api',
      baseUrl: 'https://api.example.com/v1',
      model: 'example-model',
      apiProtocol: 'openai',
      apiVersion: '2024-10-21',
      apiProviderBaseUrl: null,
      agentId: null,
      skillId: null,
      designSystemId: null,
    });
    expect(body).not.toHaveProperty('apiKey');
    expect(body).not.toHaveProperty('apiProtocolConfigs');
    expect(body).not.toHaveProperty('mediaProviders');
    expect(body).not.toHaveProperty('composio');
  });
});

describe('mergeDaemonConfigPrefs', () => {
  it('restores daemon-backed execution settings without touching local secrets', () => {
    const merged = mergeDaemonConfigPrefs(
      {
        ...DEFAULT_CONFIG,
        apiKey: 'local-secret',
        apiProtocolConfigs: {
          anthropic: {
            apiKey: 'protocol-secret',
            baseUrl: 'https://api.anthropic.com',
            model: 'claude-sonnet-4-5',
          },
        },
      },
      {
        onboardingCompleted: true,
        mode: 'api',
        baseUrl: 'https://api.example.com/v1',
        model: 'example-model',
        apiProtocol: 'openai',
        apiVersion: '2024-10-21',
        apiProviderBaseUrl: null,
        agentId: 'codex',
        agentModels: { codex: { model: 'gpt-5.1', reasoning: 'high' } },
        skillId: 'dashboard',
        designSystemId: 'default',
      },
    );

    expect(merged).toMatchObject({
      onboardingCompleted: true,
      mode: 'api',
      baseUrl: 'https://api.example.com/v1',
      model: 'example-model',
      apiProtocol: 'openai',
      apiVersion: '2024-10-21',
      apiProviderBaseUrl: null,
      agentId: 'codex',
      agentModels: { codex: { model: 'gpt-5.1', reasoning: 'high' } },
      skillId: 'dashboard',
      designSystemId: 'default',
    });
    expect(merged.apiKey).toBe('local-secret');
    expect(merged.apiProtocolConfigs?.anthropic?.apiKey).toBe('protocol-secret');
  });
});

afterEach(() => {
  store.clear();
});

describe('loadConfig', () => {
  it('migrates legacy OpenAI-compatible API configs to an explicit apiProtocol', () => {
    const legacyConfig: Partial<AppConfig> = {
      mode: 'api',
      apiKey: 'sk-test',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      agentId: null,
      skillId: null,
      designSystemId: null,
    };
    store.set('open-design:config', JSON.stringify(legacyConfig));

    const config = loadConfig();

    expect(config.mode).toBe('api');
    expect(config.baseUrl).toBe('https://api.deepseek.com');
    expect(config.model).toBe('deepseek-chat');
    expect(config.apiProtocol).toBe('openai');
    expect(config.configMigrationVersion).toBe(1);
  });

  it('migrates legacy Anthropic API configs to an explicit apiProtocol', () => {
    const legacyConfig: Partial<AppConfig> = {
      mode: 'api',
      apiKey: 'sk-test',
      baseUrl: 'https://api.anthropic.com',
      model: 'claude-sonnet-4-5',
      agentId: null,
      skillId: null,
      designSystemId: null,
    };
    store.set('open-design:config', JSON.stringify(legacyConfig));

    const config = loadConfig();

    expect(config.apiProtocol).toBe('anthropic');
  });

  it('infers protocol for legacy daemon-mode API fields without changing mode', () => {
    const daemonConfig: Partial<AppConfig> = {
      mode: 'daemon',
      apiKey: 'sk-test',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      agentId: 'codex',
      skillId: null,
      designSystemId: null,
    };
    store.set('open-design:config', JSON.stringify(daemonConfig));

    const config = loadConfig();

    expect(config.mode).toBe('daemon');
    expect(config.apiProtocol).toBe('openai');
    expect(config.configMigrationVersion).toBe(1);
  });

  it('does not overwrite an already explicit apiProtocol', () => {
    const explicitConfig: Partial<AppConfig> = {
      mode: 'api',
      apiProtocol: 'anthropic',
      apiKey: 'sk-test',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      agentId: null,
      skillId: null,
      designSystemId: null,
    };
    store.set('open-design:config', JSON.stringify(explicitConfig));

    const config = loadConfig();

    expect(config.apiProtocol).toBe('anthropic');
  });

  it('preserves saved settings when migration sees a malformed base URL', () => {
    const legacyConfig: Partial<AppConfig> = {
      mode: 'api',
      apiKey: 'sk-test',
      baseUrl: 'https://[broken-ipv6',
      model: 'custom-model',
      agentId: null,
      skillId: null,
      designSystemId: null,
    };
    store.set('open-design:config', JSON.stringify(legacyConfig));

    const config = loadConfig();

    expect(config.mode).toBe('api');
    expect(config.apiKey).toBe('sk-test');
    expect(config.baseUrl).toBe('https://[broken-ipv6');
    expect(config.model).toBe('custom-model');
    expect(config.apiProtocol).toBe('anthropic');
  });

  it('returns defaults for malformed localStorage JSON', () => {
    store.set('open-design:config', '{broken-json');

    expect(loadConfig()).toEqual(DEFAULT_CONFIG);
  });

  it('sets an explicit apiProtocol for new default configs', () => {
    expect(DEFAULT_CONFIG.apiProtocol).toBe('anthropic');
    expect(DEFAULT_CONFIG.configMigrationVersion).toBe(1);
  });
});
