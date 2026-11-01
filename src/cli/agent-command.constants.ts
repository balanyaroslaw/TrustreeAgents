import { AgentRole } from '../agents/agent-role.enum';
import { OrchestratorTask } from '../agents/orchestrator/orchestrator-task.enum';
import type { CallTarget } from '../sdk/call-scope.types';

// What `team agent <role>` accepts. One agent per call: the pipeline is the executor's job.
export const AGENT_TARGETS: Readonly<Record<string, CallTarget>> = {
  developer: { role: AgentRole.Developer, task: null },
  qa: { role: AgentRole.Qa, task: null },
  reviewer: { role: AgentRole.Reviewer, task: null },
  'orchestrator:plan': { role: AgentRole.Orchestrator, task: OrchestratorTask.Plan },
};

export const SINGLE_STEP_INDEX = 1;
export const SINGLE_STEP_TOTAL = 1;
export const SINGLE_ATTEMPT = 1;

export const MISSING_TARGET_MESSAGE = `error: missing role. Usage: team agent <${Object.keys(AGENT_TARGETS).join('|')}> "<task>"`;
export const MISSING_TASK_MESSAGE =
  'error: missing task. Usage: team agent <role> "<what the agent should do>"';
export const INVALID_MAX_TURNS_MESSAGE = 'error: --max-turns must be a positive integer';

export const AGENT_FAILED_LABEL = 'the agent call failed';
export const AGENT_EXIT_CODE = 1;
