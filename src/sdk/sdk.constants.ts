import type { ModelSettings } from '@openai/agents';

// Streaming is on by default: the terminal shows which tool the agent is using while it works.
export const SDK_STREAMING_ENABLED = true;

// The openai client the SDK uses retries transient failures itself (its maxRetries defaults to
// 2), so the invoker adds no second layer. Raise this only if that default is turned off.
export const SDK_RETRY_ATTEMPTS = 0;
export const SDK_RETRY_BASE_DELAY_MS = 1_000;
export const SDK_RETRY_MAX_DELAY_MS = 8_000;
export const RETRY_BACKOFF_FACTOR = 2;

// The agents read and write private source code, so responses are not stored on the provider.
export const AGENT_MODEL_SETTINGS: ModelSettings = { store: false };

export const INSTRUCTIONS_HASH_ALGORITHM = 'sha256';
export const INTERNAL_TOOL_FAILURE_PREFIX = 'Error: internal tool failure: ';
export const MAX_TOOL_SUMMARY_CHARACTERS = 120;
export const UNKNOWN_TOOL_NAME = 'tool';
export const ORCHESTRATOR_AGENT_NAME_SEPARATOR = ' ';
