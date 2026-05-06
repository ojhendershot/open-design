export interface AgentModelPrefs {
  model?: string;
  reasoning?: string;
}

export type AppConfigExecMode = 'daemon' | 'api';
export type AppConfigApiProtocol = 'anthropic' | 'openai' | 'azure' | 'google';

export interface AppConfigPrefs {
  onboardingCompleted?: boolean;
  mode?: AppConfigExecMode;
  baseUrl?: string;
  model?: string;
  apiProtocol?: AppConfigApiProtocol;
  apiVersion?: string;
  apiProviderBaseUrl?: string | null;
  agentId?: string | null;
  agentModels?: Record<string, AgentModelPrefs>;
  skillId?: string | null;
  designSystemId?: string | null;
}

export interface AppConfigResponse {
  config: AppConfigPrefs;
}

export type UpdateAppConfigRequest = Partial<AppConfigPrefs>;
