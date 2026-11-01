import { AgentRole } from '../agents/agent-role.enum';

export const OPENAI_API_KEY_VARIABLE = 'OPENAI_API_KEY';
export const ENV_FILE_NAME = '.env';
export const ENV_EXAMPLE_NAME = '.env.example';

// Optional per-role overrides, so a run can be made cheaper without a code change.
export const MODEL_VARIABLE_BY_ROLE: Readonly<Record<AgentRole, string>> = {
  [AgentRole.Orchestrator]: 'ORCHESTRATOR_MODEL',
  [AgentRole.Developer]: 'DEVELOPER_MODEL',
  [AgentRole.Qa]: 'QA_MODEL',
  [AgentRole.Reviewer]: 'REVIEWER_MODEL',
};

export const MISSING_API_KEY_MESSAGE =
  `${OPENAI_API_KEY_VARIABLE} is not set, so no model can be called. ` +
  `Add it to ${ENV_FILE_NAME} (see ${ENV_EXAMPLE_NAME}) and run the command again`;

export const INVALID_API_KEY_SHAPE_MESSAGE =
  `${OPENAI_API_KEY_VARIABLE} is empty. Put the real key in ${ENV_FILE_NAME} ` +
  `(see ${ENV_EXAMPLE_NAME})`;
