import type { ModelSettings } from '@openai/agents';

// Streaming is on by default: the terminal shows which tool the agent is using while it works.
export const SDK_STREAMING_ENABLED = true;

// The agents read and write private source code, so responses are not stored on the provider.
export const AGENT_MODEL_SETTINGS: ModelSettings = { store: false };

// A caller that does not say otherwise gets the start, token and end events of every call.
export const LIFECYCLE_EVENTS_ENABLED = true;

export const INSTRUCTIONS_HASH_ALGORITHM = 'sha256';
export const INTERNAL_TOOL_FAILURE_PREFIX = 'Error: internal tool failure: ';
export const MAX_TOOL_SUMMARY_CHARACTERS = 120;
export const UNKNOWN_TOOL_NAME = 'tool';
export const ORCHESTRATOR_AGENT_NAME_SEPARATOR = ' ';
