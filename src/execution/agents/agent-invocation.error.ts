import type { AgentRole } from '../../agents/agent-role.enum';
import type { OrchestratorTask } from '../../agents/orchestrator/orchestrator-task.enum';
import { AgentFailureKind } from './agent-failure.enum';
import type { AgentUsage, PartialInvocation } from './agent-invocation.types';

const EMPTY_USAGE: AgentUsage = { input: 0, cachedInput: 0, output: 0, total: 0 };

// Thrown by the AgentInvoker implementation. It always carries what the call spent and changed
// before it failed, so the budget and the report stay complete.
export class AgentInvocationError extends Error {
  readonly kind: AgentFailureKind;
  readonly role: AgentRole;
  readonly task: OrchestratorTask | null;
  readonly partial: PartialInvocation;

  constructor(
    kind: AgentFailureKind,
    role: AgentRole,
    task: OrchestratorTask | null,
    partial: PartialInvocation,
    message: string,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = 'AgentInvocationError';
    this.kind = kind;
    this.role = role;
    this.task = task;
    this.partial = partial;
  }

  static cancelled(role: AgentRole, task: OrchestratorTask | null): AgentInvocationError {
    return new AgentInvocationError(
      AgentFailureKind.Cancelled,
      role,
      task,
      AgentInvocationError.nothingSpent(),
      'the agent call was cancelled',
    );
  }

  static nothingSpent(): PartialInvocation {
    return { usage: EMPTY_USAGE, changes: [], commandRuns: [] };
  }
}
