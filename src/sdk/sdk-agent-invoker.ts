import { Logger } from '@nestjs/common';
import { run } from '@openai/agents';
import { createHash } from 'node:crypto';
import type { AgentRole } from '../agents/agent-role.enum';
import type { DefinedAgentRole } from '../agents/agent-definition.types';
import type { OrchestratorTask } from '../agents/orchestrator/orchestrator-task.enum';
import { AgentCallRepository } from '../db/repositories/agent-call.repository';
import type { EventBus } from '../events/event-bus';
import { AgentFailureKind } from '../execution/agents/agent-failure.enum';
import { AgentInvocationError } from '../execution/agents/agent-invocation.error';
import type { AgentInvocation, AgentUsage } from '../execution/agents/agent-invocation.types';
import type { AgentInvoker } from '../execution/agents/agent-invoker.port.types';
import { ErrorInspector } from '../workspace/utils/error.inspector';
import type { AgentCallStore } from '../workspace/activity/agent-call.store';
import { AgentCallContext } from './agent-call.context';
import type { AgentFactory } from './agent.factory';
import type { BuiltAgent } from './built-agent.types';
import { CallEventEmitter } from './call-event.emitter';
import type { CallScope, CallTarget, InvokerOptions } from './call-scope.types';
import { SdkErrorMapper } from './sdk-error.mapper';
import type { SdkBootstrap } from './sdk.bootstrap';
import {
  INSTRUCTIONS_HASH_ALGORITHM,
  LIFECYCLE_EVENTS_ENABLED,
  SDK_STREAMING_ENABLED,
} from './sdk.constants';
import { StreamEventMapper } from './stream-event.mapper';
import { UsageReader } from './usage.reader';
import { UsageTally } from './usage.tally';

// The only way a model is called. Every call is built fresh, run inside its own recorder scope,
// and written to agent_calls whether it succeeded or failed: there is no path to a model that is
// not accounted for.
export class SdkAgentInvoker implements AgentInvoker {
  private readonly logger = new Logger(SdkAgentInvoker.name);

  constructor(
    private readonly factory: AgentFactory,
    private readonly bootstrap: SdkBootstrap,
    private readonly store: AgentCallStore,
    private readonly calls: AgentCallRepository,
    private readonly events: EventBus,
    private readonly scope: CallScope,
    private readonly options: InvokerOptions,
  ) {}

  async invokeAgent<TOutput>(
    role: AgentRole,
    inputText: string,
    signal: AbortSignal,
  ): Promise<AgentInvocation<TOutput>> {
    return this.invoke<TOutput>({ role, task: null }, inputText, signal);
  }

  async invokeOrchestrator<TOutput>(
    task: OrchestratorTask,
    inputText: string,
    signal: AbortSignal,
  ): Promise<AgentInvocation<TOutput>> {
    return this.invoke<TOutput>({ role: this.orchestratorRole(), task }, inputText, signal);
  }

  private async invoke<TOutput>(
    target: CallTarget,
    inputText: string,
    signal: AbortSignal,
  ): Promise<AgentInvocation<TOutput>> {
    const models = this.bootstrap.ensureReady();
    const context = new AgentCallContext(target.role, target.task);
    const emitter = new CallEventEmitter(this.events, this.scope, target);
    const streaming = this.options.streaming ?? SDK_STREAMING_ENABLED;
    const built = this.build(target, context, models[target.role], streaming ? null : emitter);
    const tally = new UsageTally();
    const started = Date.now();
    const lifecycle = this.options.lifecycleEvents ?? LIFECYCLE_EVENTS_ENABLED;
    if (lifecycle) {
      emitter.agentStarted();
    }

    try {
      const output = await this.store.run(context.recorders, () =>
        this.runOnce(built, inputText, signal, emitter, streaming, tally),
      );
      const usage = tally.snapshot();
      const durationMs = Date.now() - started;
      if (lifecycle) {
        emitter.tokensUsed(usage.input, usage.cachedInput, usage.output, usage.total);
      }
      await this.record(target, built, usage, context.toolCalls, durationMs, null);
      if (lifecycle) {
        emitter.agentFinished(context.toolCalls, durationMs, null);
      }

      return {
        output: output as TOutput,
        usage,
        toolCalls: context.toolCalls,
        durationMs,
        changes: context.changes(),
        commandRuns: context.commandRuns(),
        readPaths: context.readPaths(),
      };
    } catch (error) {
      const kind = SdkErrorMapper.map(error);
      const usage = tally.snapshot();
      const durationMs = Date.now() - started;
      await this.record(target, built, usage, context.toolCalls, durationMs, kind);
      if (lifecycle) {
        emitter.agentFinished(context.toolCalls, durationMs, kind);
      }

      throw new AgentInvocationError(
        kind,
        target.role,
        target.task,
        { usage, changes: context.changes(), commandRuns: context.commandRuns() },
        SdkErrorMapper.message(error, kind),
        error,
      );
    }
  }

  private build(
    target: CallTarget,
    context: AgentCallContext,
    model: string,
    emitter: CallEventEmitter | null,
  ): BuiltAgent {
    const { maxTurns } = this.options;
    if (target.task === null) {
      return this.factory.buildAgent({
        role: target.role as DefinedAgentRole,
        context,
        model,
        maxTurns,
        emitter,
      });
    }
    return this.factory.buildOrchestrator({ task: target.task, context, model, maxTurns, emitter });
  }

  // Transient failures are retried by the openai client itself (its maxRetries defaults to 2 and
  // nothing here overrides it), so this layer adds none of its own. A schema failure is not a
  // transport failure and is never retried here: the executor decides what to do with it.
  private async runOnce(
    built: BuiltAgent,
    inputText: string,
    signal: AbortSignal,
    emitter: CallEventEmitter,
    streaming: boolean,
    tally: UsageTally,
  ): Promise<unknown> {
    if (!streaming) {
      const result = await run(built.agent, inputText, { maxTurns: built.maxTurns, signal });
      tally.add(UsageReader.read(result));
      return result.finalOutput;
    }

    const stream = await run(built.agent, inputText, {
      maxTurns: built.maxTurns,
      signal,
      stream: true,
    });
    try {
      for await (const event of stream) {
        StreamEventMapper.forward(event, emitter);
      }
      await stream.completed;
    } finally {
      // Counted even when the stream failed halfway, so nothing is lost from the accounting.
      tally.add(UsageReader.read(stream));
    }

    return stream.finalOutput;
  }

  // Writing the row must never fail the call: the work is already done when this runs.
  private async record(
    target: CallTarget,
    built: BuiltAgent,
    usage: AgentUsage,
    toolCalls: number,
    durationMs: number,
    failure: AgentFailureKind | null,
  ): Promise<void> {
    try {
      const recorded = await this.calls.record({
        runId: this.scope.runId,
        attemptId: this.scope.attemptId ?? null,
        role: target.role,
        task: target.task,
        model: built.model,
        inputTokens: usage.input,
        cachedInputTokens: usage.cachedInput,
        outputTokens: usage.output,
        toolCalls,
        durationMs,
        failureKind: failure,
        instructionsHash: SdkAgentInvoker.hashOf(built.instructions),
      });
      if (recorded.warning !== null) {
        this.logger.warn(recorded.warning);
      }
    } catch (error) {
      this.logger.warn(ErrorInspector.message(error));
    }
  }

  private orchestratorRole(): AgentRole {
    return this.factory.orchestratorRole();
  }

  private static hashOf(instructions: string): string {
    return createHash(INSTRUCTIONS_HASH_ALGORITHM).update(instructions).digest('hex');
  }
}
