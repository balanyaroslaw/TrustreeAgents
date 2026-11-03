import { AgentRole } from '../../agents/agent-role.enum';
import type { OrchestratorTask } from '../../agents/orchestrator/orchestrator-task.enum';
import { AgentEventKind } from '../../events/agent-event-kind.enum';
import type { AgentCallOrigin } from '../../events/agent-event.types';
import type { EventBus } from '../../events/event-bus';
import type { RunBudget } from '../budget/run-budget';
import { AGENT_RETRY_ATTEMPTS, REQUIRED_CALL_TOKEN_RESERVE } from '../execution.constants';
import type { AgentCallRecord } from '../execution.types';
import { AgentFailureKind } from './agent-failure.enum';
import { AgentInvocationError } from './agent-invocation.error';
import type { AgentCallLedger } from './agent-call.ledger';
import type { AgentInvocation, AgentCallScope, AgentUsage } from './agent-invocation.types';
import type { AgentInvokerFactory } from './agent-invoker-factory.port.types';

const FIRST_TRY = 0;
const NO_TOOL_CALLS = 0;

// One instance per run: it is the only place agent calls happen. Every call is checked against
// the abort signal and the budget first, given the cap it may spend, charged afterwards, and
// retried once when the model breaks its output schema. The invoker is asked for per call,
// scoped to the attempt the call belongs to, so the row the invoker writes carries that attempt.
export class AgentCallRunner {
  constructor(
    private readonly invokers: AgentInvokerFactory,
    private readonly events: EventBus,
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
    // What this one call may spend: the per-call cap, or the rest of the run budget when that is
    // less. The invoker aborts the call on it instead of letting it overshoot the run.
    const tokenCap = this.budget.callCap();
    this.events.emit({
      kind: AgentEventKind.AgentStarted,
      runId: this.runId,
      at: Date.now(),
      origin,
    });
    const started = Date.now();
    const invoker = this.invokers.forScope({
      runId: this.runId,
      attemptId: scope.attemptId,
      stepIndex: scope.stepIndex,
      attempt: scope.attempt,
    });

    try {
      const invocation =
        task === null
          ? await invoker.invokeAgent<TOutput>(role, inputText, this.signal, tokenCap)
          : await invoker.invokeOrchestrator<TOutput>(task, inputText, this.signal, tokenCap);
      this.account(
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
        if (error.kind === AgentFailureKind.BudgetExceeded) {
          this.events.emit({
            kind: AgentEventKind.CallCapExceeded,
            runId: this.runId,
            at: Date.now(),
            origin,
            spent: error.partial.usage.total,
            cap: tokenCap,
          });
        }
        this.account(
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

  private account(
    origin: AgentCallOrigin,
    usage: AgentUsage,
    toolCalls: number,
    commandRuns: number,
    durationMs: number,
    failure: AgentFailureKind | null,
  ): void {
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
    // agent_calls is written by the invoker, which is the only path to a model; the ledger is
    // the in-memory view the report is built from. The events below are emitted here and not in
    // the invoker, so they read the same whichever invoker ran the call: the invoker is asked for
    // them with lifecycleEvents off.
    this.ledger.record(record);

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
