import type { AgentRole } from '../../agents/agent-role.enum';
import type { OrchestratorTask } from '../../agents/orchestrator/orchestrator-task.enum';
import type { AgentInvocation } from './agent-invocation.types';

// The only way the execution core reaches an agent. The implementation holds the SDK, the agent
// definitions and the output schemas, so core code never imports the SDK and stays testable.
// Failures are thrown as AgentInvocationError.
//
// `tokenCap` is the most that one call may spend: the implementation watches what the call has
// spent and aborts it with AgentFailureKind.BudgetExceeded once it is past the cap, so no single
// call can overshoot the run budget between two checks of it.
export interface AgentInvoker {
  invokeAgent<TOutput>(
    role: AgentRole,
    inputText: string,
    signal: AbortSignal,
    tokenCap: number,
  ): Promise<AgentInvocation<TOutput>>;

  invokeOrchestrator<TOutput>(
    task: OrchestratorTask,
    inputText: string,
    signal: AbortSignal,
    tokenCap: number,
  ): Promise<AgentInvocation<TOutput>>;
}
