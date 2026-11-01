import { AgentRole } from '../../agents/agent-role.enum';
import type { OrchestratorTask } from '../../agents/orchestrator/orchestrator-task.enum';
import { AgentEventKind } from '../../events/agent-event-kind.enum';
import type { AgentCallOrigin } from '../../events/agent-event.types';
import type { EventBus } from '../../events/event-bus';
import type { RunBudget } from '../budget/run-budget';
import { AGENT_RETRY_ATTEMPTS, REQUIRED_CALL_TOKEN_RESERVE } from '../execution.constants';
import type { AgentCallRecord } from '../execution.types';
import type { AttemptRepository } from '../persistence/attempt-repository.port.types';
import { AgentFailureKind } from './agent-failure.enum';
import { AgentInvocationError } from './agent-invocation.error';
import type { AgentCallLedger } from './agent-call.ledger';
import type { AgentInvocation, AgentCallScope, AgentUsage } from './agent-invocation.types';
import type { AgentInvoker } from './agent-invoker.port.types';

const FIRST_TRY = 0;
const NO_TOOL_CALLS = 0;

// One instance per run: it is the only place agent calls happen. Every call is checked against
// the abort signal and the budget first, charged and recorded afterwards, and retried once when
// the model breaks its output schema.
export class AgentCallRunner {
  constructor(
    private readonly invoker: AgentInvoker,
    private readonly events: EventBus,
    private readonly attempts: AttemptRepository,
    private readonly ledger: AgentCallLedger,
    private readonly budget: RunBudget,
    private readonly runId: string,
    private readonly signal: AbortSignal,
  ) {}

  async agent<TOutput>(
    role: AgentRole,
    inputText: string,
    scope: AgentCallScope,
  ): Promise<AgentInvocation<TOutput>> {
    return this.call<TOutput>(role, null, inputText, scope);
  }

  async orchestrator<TOutput>(
    task: OrchestratorTask,
    inputText: string,
    scope: AgentCallScope,
  ): Promise<AgentInvocation<TOutput>> {
    return this.call<TOutput>(AgentRole.Orchestrator, task, inputText, scope);
  }

  private async call<TOutput>(
    role: AgentRole,
    task: OrchestratorTask | null,
    inputText: string,
    scope: AgentCallScope,
  ): Promise<AgentInvocation<TOutput>> {
    for (let retry = FIRST_TRY; ; retry += 1) {
      try {
        return await this.invokeOnce<TOutput>(role, task, inputText, scope);
      } catch (error) {
        if (!AgentCallRunner.isRetryable(error) || retry >= AGENT_RETRY_ATTEMPTS) {
          throw error;
        }
      }
    }
  }

  private async invokeOnce<TOutput>(
    role: AgentRole,
    task: OrchestratorTask | null,
    inputText: string,
    scope: AgentCallScope,
  ): Promise<AgentInvocation<TOutput>> {
    const origin: AgentCallOrigin = {
      role,
      task,
      stepIndex: scope.stepIndex,
      attempt: scope.attempt,
    };
    this.assertRunnable(role, task);
    this.events.emit({
      kind: AgentEventKind.AgentStarted,
      runId: this.runId,
      at: Date.now(),
      origin,
    });
    const started = Date.now();

    try {
      const invocation =
        task === null
          ? await this.invoker.invokeAgent<TOutput>(role, inputText, this.signal)
          : await this.invoker.invokeOrchestrator<TOutput>(task, inputText, this.signal);
      await this.account(
        origin,
        invocation.usage,
        invocation.toolCalls,
        invocation.commandRuns.length,
        invocation.durationMs,
        null,
      );
      return invocation;
    } catch (error) {
      if (error instanceof AgentInvocationError) {
        await this.account(
          origin,
          error.partial.usage,
          NO_TOOL_CALLS,
          error.partial.commandRuns.length,
          Date.now() - started,
          error.kind,
        );
      }
      throw error;
    }
  }

  private async account(
    origin: AgentCallOrigin,
    usage: AgentUsage,
    toolCalls: number,
    commandRuns: number,
    durationMs: number,
    failure: AgentFailureKind | null,
  ): Promise<void> {
    const record: AgentCallRecord = {
      runId: this.runId,
      role: origin.role,
      task: origin.task,
      stepIndex: origin.stepIndex,
      attempt: origin.attempt,
      tokens: {
        input: usage.input,
        cachedInput: usage.cachedInput,
        output: usage.output,
        total: usage.total,
      },
      toolCalls,
      commandRuns,
      durationMs,
      failure,
    };
    this.ledger.record(record);
    await this.attempts.appendAgentCall(record);

    const at = Date.now();
    this.events.emit({
      kind: AgentEventKind.TokensUsed,
      runId: this.runId,
      at,
      origin,
      input: usage.input,
      cachedInput: usage.cachedInput,
      output: usage.output,
      total: usage.total,
    });
    this.events.emit({
      kind: AgentEventKind.AgentFinished,
      runId: this.runId,
      at,
      origin,
      toolCalls,
      durationMs,
      failure,
    });

    try {
      this.budget.charge(usage);
    } finally {
      this.events.emit({
        kind: AgentEventKind.BudgetUpdated,
        runId: this.runId,
        at: Date.now(),
        spent: this.budget.spent(),
        remaining: this.budget.remaining(),
        limit: this.budget.total(),
      });
    }
  }

  private assertRunnable(role: AgentRole, task: OrchestratorTask | null): void {
    if (this.signal.aborted) {
      throw AgentInvocationError.cancelled(role, task);
    }
    this.budget.assertRoom(REQUIRED_CALL_TOKEN_RESERVE);
  }

  private static isRetryable(error: unknown): boolean {
    return error instanceof AgentInvocationError && error.kind === AgentFailureKind.InvalidOutput;
  }
}
