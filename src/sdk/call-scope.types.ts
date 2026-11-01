import type { OrchestratorTask } from '../agents/orchestrator/orchestrator-task.enum';
import type { AgentRole } from '../agents/agent-role.enum';

// Where a model call belongs: the run always, and the step and attempt when the executor is
// driving. `team agent` creates a run with a single call and leaves the rest unset.
export interface CallScope {
  readonly runId: string;
  readonly attemptId?: string | null;
  readonly stepIndex?: number | null;
  readonly attempt?: number | null;
}

// Which agent is being called: a role, and the task when it is the Orchestrator.
export interface CallTarget {
  readonly role: AgentRole;
  readonly task: OrchestratorTask | null;
}

export interface InvokerOptions {
  readonly streaming?: boolean;
  readonly maxTurns?: number;
  // False when a caller above the invoker already reports the start, the tokens and the end of
  // every call, as the executor's AgentCallRunner does. tool_called is emitted either way,
  // because only this layer sees it.
  readonly lifecycleEvents?: boolean;
}
