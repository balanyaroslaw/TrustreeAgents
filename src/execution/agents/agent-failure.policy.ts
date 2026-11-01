import { ExecutionMessages } from '../execution.messages';
import { AgentFailureKind } from './agent-failure.enum';
import { AgentInvocationError } from './agent-invocation.error';

// Which failures an attempt can absorb. A Developer, QA or Reviewer call that ran out of turns or
// never produced a valid answer leaves incomplete work: the attempt becomes a rework with that
// note. Everything else - an API error, a cancellation, a failed Orchestrator call - stops the
// run, because the executor would be guessing otherwise.
export class AgentFailurePolicy {
  static reworkNote(error: AgentInvocationError): string | null {
    if (error.task !== null) {
      return null;
    }
    if (error.kind === AgentFailureKind.MaxTurns) {
      return ExecutionMessages.agentOutOfTurns(error.role);
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
