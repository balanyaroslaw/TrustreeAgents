import type { AgentRole } from '../../agents/agent-role.enum';
import type { OrchestratorTask } from '../../agents/orchestrator/orchestrator-task.enum';
import type { AgentInvocation } from './agent-invocation.types';

// The only way the execution core reaches an agent. The implementation holds the SDK, the agent
// definitions and the output schemas, so core code never imports the SDK and stays testable.
// Failures are thrown as AgentInvocationError.
export interface AgentInvoker {
  invokeAgent<TOutput>(
    role: AgentRole,
    inputText: string,
    signal: AbortSignal,
  ): Promise<AgentInvocation<TOutput>>;

  invokeOrchestrator<TOutput>(
    task: OrchestratorTask,
    inputText: string,
    signal: AbortSignal,
  ): Promise<AgentInvocation<TOutput>>;
}
