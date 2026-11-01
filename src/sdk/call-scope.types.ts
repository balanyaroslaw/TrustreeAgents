import type { OrchestratorTask } from '../agents/orchestrator/orchestrator-task.enum';
import type { AgentRole } from '../agents/agent-role.enum';

// Which run and attempt a model call belongs to. `team agent` creates a run with a single call,
// the executor passes its own run and attempt.
export interface CallScope {
  readonly runId: string;
  readonly attemptId?: string | null;
}

// Which agent is being called: a role, and the task when it is the Orchestrator.
export interface CallTarget {
  readonly role: AgentRole;
  readonly task: OrchestratorTask | null;
}

export interface InvokerOptions {
  readonly streaming?: boolean;
  readonly maxTurns?: number;
}
