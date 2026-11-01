import type { AgentInvoker } from './agent-invoker.port.types';

// Which run and attempt the calls of one invoker belong to. Declared here, not imported from
// src/sdk, so the execution core keeps no dependency on the SDK layer.
export interface InvokerScope {
  readonly runId: string;
  readonly attemptId?: string | null;
  readonly stepIndex?: number | null;
  readonly attempt?: number | null;
}

// One invoker per scope: the executor asks for an invoker bound to the attempt that is running,
// so every agent_calls row carries the attempt it was made for.
export interface AgentInvokerFactory {
  forScope(scope: InvokerScope): AgentInvoker;
}
