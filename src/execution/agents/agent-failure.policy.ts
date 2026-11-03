import { ExecutionMessages } from '../execution.messages';
import { AgentFailureKind } from './agent-failure.enum';
import { AgentInvocationError } from './agent-invocation.error';

// Which failures an attempt can absorb. A Developer, QA or Reviewer call that ran out of turns,
// that was stopped on its token cap, or that never produced a valid answer leaves incomplete
// work: the attempt becomes a rework with that note. Everything else - an API error, a
// cancellation, a failed Orchestrator call - stops the run, because the executor would be
// guessing otherwise.
export class AgentFailurePolicy {
  static reworkNote(error: AgentInvocationError): string | null {
    if (error.task !== null) {
      return null;
    }
    if (error.kind === AgentFailureKind.MaxTurns) {
      return ExecutionMessages.agentOutOfTurns(error.role);
    }
    // The tokens are already charged to the run; the attempt goes on with what the call left
    // behind, so one expensive call costs an attempt instead of the whole run.
    if (error.kind === AgentFailureKind.BudgetExceeded) {
      return ExecutionMessages.agentHitTokenCap(error.role, error.partial.usage.total);
    }
    if (error.kind === AgentFailureKind.InvalidOutput) {
      return ExecutionMessages.agentInvalidOutput(error.role);
    }
    return null;
  }

  static stopReason(error: AgentInvocationError): string {
    if (error.task !== null) {
      return ExecutionMessages.orchestratorCallFailed(error.task, error.kind);
    }
    if (error.kind === AgentFailureKind.Cancelled) {
      return ExecutionMessages.cancelled();
    }
    return ExecutionMessages.agentCallFailed(error.role, error.kind, error.message);
  }
}
