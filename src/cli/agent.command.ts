import { Inject } from '@nestjs/common';
import { Command, Option } from 'nest-commander';
import { basename } from 'node:path';
import { ConfigurationError } from '../config/configuration.error';
import { DatabaseBootstrap } from '../db/database.bootstrap';
import { ProjectRepository } from '../db/repositories/project.repository';
import { RunRepository } from '../db/repositories/run.repository';
import { EventBus } from '../events/event-bus';
import { AgentInvocationError } from '../execution/agents/agent-invocation.error';
import { MAX_TOKENS_PER_AGENT_CALL } from '../execution/execution.constants';
import { RunStatus } from '../execution/run-status.enum';
import { SdkInvokerFactory } from '../sdk/sdk-invoker.factory';
import type { CallTarget } from '../sdk/call-scope.types';
import { WorkspaceService } from '../workspace/workspace.service';
import {
  AGENT_EXIT_CODE,
  AGENT_FAILED_LABEL,
  INVALID_MAX_TURNS_MESSAGE,
  MISSING_TARGET_MESSAGE,
  MISSING_TASK_MESSAGE,
} from './agent-command.constants';
import { AgentInputBuilder } from './agent-input.builder';
import { AgentReportPrinter } from './agent-report.printer';
import { AgentTargetParser } from './agent-target.parser';
import type { AgentCommandOptions } from './command-options.types';
import { DatabaseCommand } from './database.command';
import { EventPrinter } from './event-printer';

const ROLE_INPUT = 0;
const TASK_INPUT = 1;
const NO_TURNS = 0;

// Runs one agent against the workspace and prints its report. This is the checkpoint that proves
// the SDK integration before the executor runs the whole pipeline: no branches, no commits.
@Command({
  name: 'agent',
  description: 'Run a single agent against the workspace',
  arguments: '[role] [task]',
  argsDescription: {
    role: 'developer, qa, reviewer or orchestrator:plan',
    task: 'what the agent should do',
  },
})
export class AgentCommand extends DatabaseCommand {
  constructor(
    @Inject(DatabaseBootstrap) bootstrap: DatabaseBootstrap,
    @Inject(WorkspaceService) private readonly workspace: WorkspaceService,
    @Inject(ProjectRepository) private readonly projects: ProjectRepository,
    @Inject(RunRepository) private readonly runs: RunRepository,
    @Inject(SdkInvokerFactory) private readonly invokers: SdkInvokerFactory,
    @Inject(AgentInputBuilder) private readonly inputs: AgentInputBuilder,
    @Inject(AgentReportPrinter) private readonly printer: AgentReportPrinter,
    @Inject(EventBus) private readonly events: EventBus,
  ) {
    super(bootstrap);
  }

  async run(inputs: string[], options: AgentCommandOptions): Promise<void> {
    const target = AgentCommand.targetOf(inputs[ROLE_INPUT]);
    const task = inputs[TASK_INPUT]?.trim();
    if (task === undefined || task === '') {
      console.error(MISSING_TASK_MESSAGE);
      process.exit(AGENT_EXIT_CODE);
    }
    if (options.maxTurns !== undefined && !AgentCommand.isPositive(options.maxTurns)) {
      console.error(INVALID_MAX_TURNS_MESSAGE);
      process.exit(AGENT_EXIT_CODE);
    }
    await this.ensureDatabase();

    const printer = new EventPrinter();
    this.events.subscribe(printer);
    try {
      await this.runAgent(target, task, options);
    } catch (error) {
      AgentCommand.reportFailure(error);
    } finally {
      this.events.unsubscribe(printer);
    }
  }

  @Option({
    flags: '-w, --workspace <path>',
    description: 'workspace directory the agent works in',
  })
  parseWorkspace(value: string): string {
    return value;
  }

  @Option({
    flags: '--no-stream',
    description: 'wait for the whole answer instead of showing live tool calls',
  })
  parseNoStream(): boolean {
    return false;
  }

  @Option({
    flags: '--max-turns <n>',
    description: 'override how many turns the agent may take',
  })
  parseMaxTurns(value: string): number {
    return Number(value);
  }

  private async runAgent(
    target: CallTarget,
    task: string,
    options: AgentCommandOptions,
  ): Promise<void> {
    const project = await this.projects.ensure(this.workspace.root, basename(this.workspace.root));
    const run = await this.runs.create({ projectId: project.id, prompt: task });
    const invoker = this.invokers.create(
      { runId: run.id },
      { streaming: options.stream, maxTurns: options.maxTurns },
    );
    const input = await this.inputs.build(target, task);
    const controller = new AbortController();

    try {
      // One call, no run budget to protect, so the cap is the per-call limit itself.
      const invocation =
        target.task === null
          ? await invoker.invokeAgent<unknown>(
              target.role,
              input.inputText,
              controller.signal,
              MAX_TOKENS_PER_AGENT_CALL,
            )
          : await invoker.invokeOrchestrator<unknown>(
              target.task,
              input.inputText,
              controller.signal,
              MAX_TOKENS_PER_AGENT_CALL,
            );
      await this.finish(run.id, RunStatus.Completed, null);
      await this.printer.print(target, invocation, input, await this.inputs.changedFiles());
    } catch (error) {
      await this.finish(run.id, RunStatus.Failed, AgentCommand.reasonOf(error));
      throw error;
    }
  }

  private async finish(
    runId: string,
    status: RunStatus,
    failureReason: string | null,
  ): Promise<void> {
    await this.runs.recomputeTotals(runId);
    await this.runs.close(runId, status, null, failureReason);
  }

  private static targetOf(value?: string): CallTarget {
    const target = value === undefined ? null : AgentTargetParser.parse(value);
    if (target === null) {
      console.error(MISSING_TARGET_MESSAGE);
      process.exit(AGENT_EXIT_CODE);
    }
    return target;
  }

  // A configuration or provider problem is a message, never a stack trace.
  private static reportFailure(error: unknown): never {
    if (error instanceof ConfigurationError) {
      console.error(`error: ${error.message}`);
      process.exit(AGENT_EXIT_CODE);
    }
    if (error instanceof AgentInvocationError) {
      console.error(`error: ${AGENT_FAILED_LABEL} (${error.kind}): ${error.message}`);
      process.exit(AGENT_EXIT_CODE);
    }
    throw error;
  }

  private static reasonOf(error: unknown): string | null {
    if (error instanceof AgentInvocationError) {
      return `${error.kind}: ${error.message}`;
    }
    return error instanceof ConfigurationError ? error.message : null;
  }

  private static isPositive(value: number): boolean {
    return Number.isInteger(value) && value > NO_TURNS;
  }
}
