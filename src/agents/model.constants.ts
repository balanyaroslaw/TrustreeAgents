import { AgentRole } from './agent-role.enum';

// The model each role runs on. Verify the ids against the models your account can use, and
// override them per run with the variables in MODEL_VARIABLE_BY_ROLE. Prices for whatever model
// is used live in the model_prices table, never here.
export const DEFAULT_MODEL_BY_ROLE: Readonly<Record<AgentRole, string>> = {
  [AgentRole.Orchestrator]: 'gpt-5',
  [AgentRole.Developer]: 'gpt-5',
  [AgentRole.Qa]: 'gpt-5',
  [AgentRole.Reviewer]: 'gpt-5',
};
