import { AgentEventKind } from '../events/agent-event-kind.enum';
import type { AgentCallOrigin } from '../events/agent-event.types';
import type { EventBus } from '../events/event-bus';
import type { AgentFailureKind } from '../execution/agents/agent-failure.enum';
import { MAX_TOOL_SUMMARY_CHARACTERS } from './sdk.constants';
import type { CallScope, CallTarget } from './call-scope.types';

const START = 0;

// Turns what happens during one agent call into our own events. The terminal shows status, never
// generated prose: no model text is ever forwarded.
export class CallEventEmitter {
  private readonly origin: AgentCallOrigin;

  constructor(
    private readonly events: EventBus,
    private readonly scope: CallScope,
    target: CallTarget,
  ) {
    this.origin = {
      role: target.role,
      task: target.task,
      stepIndex: scope.stepIndex ?? null,
      attempt: scope.attempt ?? null,
    };
  }

  agentStarted(): void {
    this.events.emit({
      kind: AgentEventKind.AgentStarted,
      runId: this.scope.runId,
      at: Date.now(),
      origin: this.origin,
    });
  }

  toolCalled(tool: string, summary: string): void {
    this.events.emit({
      kind: AgentEventKind.ToolCalled,
      runId: this.scope.runId,
      at: Date.now(),
      origin: this.origin,
      tool,
      summary: summary.slice(START, MAX_TOOL_SUMMARY_CHARACTERS),
    });
  }

  agentFinished(toolCalls: number, durationMs: number, failure: AgentFailureKind | null): void {
    this.events.emit({
      kind: AgentEventKind.AgentFinished,
      runId: this.scope.runId,
      at: Date.now(),
      origin: this.origin,
      toolCalls,
      durationMs,
      failure,
    });
  }

  tokensUsed(input: number, cachedInput: number, output: number, total: number): void {
    this.events.emit({
      kind: AgentEventKind.TokensUsed,
      runId: this.scope.runId,
      at: Date.now(),
      origin: this.origin,
      input,
      cachedInput,
      output,
      total,
    });
  }
}
