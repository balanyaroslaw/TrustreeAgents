import type { Agent, AgentOutputType } from '@openai/agents';
import type { DefinedAgentRole } from '../agents/agent-definition.types';
import type { OrchestratorTask } from '../agents/orchestrator/orchestrator-task.enum';
import type { AgentCallContext } from './agent-call.context';
import type { CallEventEmitter } from './call-event.emitter';

export type SdkAgent = Agent<unknown, AgentOutputType>;

// The agent for one call, with the instructions it was built from: the invoker stores their hash
// with the call, so prompt drift between runs is visible.
export interface BuiltAgent {
  readonly agent: SdkAgent;
  readonly instructions: string;
  readonly model: string;
  readonly maxTurns: number;
}

export interface AgentBuildRequest {
  readonly role: DefinedAgentRole;
  readonly context: AgentCallContext;
  readonly model: string;
  readonly maxTurns?: number;
  // Set when the tools must announce themselves; null while streaming already reports them.
  readonly emitter: CallEventEmitter | null;
}

export interface OrchestratorBuildRequest {
  readonly task: OrchestratorTask;
  readonly context: AgentCallContext;
  readonly model: string;
  readonly maxTurns?: number;
  readonly emitter: CallEventEmitter | null;
}
