import { Inject } from '@nestjs/common';
import { Command, Option } from 'nest-commander';
import { basename } from 'node:path';
import { AgentsConfig } from '../agents/agents.config';
import { ConfigurationError } from '../config/configuration.error';
import { EnvironmentReader } from '../config/environment.reader';
import { DatabaseBootstrap } from '../db/database.bootstrap';
import { ProjectRepository } from '../db/repositories/project.repository';
import { RunRepository } from '../db/repositories/run.repository';
import { EventBus } from '../events/event-bus';
import { CannedAgentInvoker } from '../execution/agents/canned-agent-invoker';
import { CONSERVATIVE_TOKEN_BUDGET } from '../execution/execution.constants';
import type { RunOutcome, RunRequest } from '../execution/execution.types';
import { PlanExecutor } from '../execution/plan-executor';
import { RunRefusedError } from '../execution/run-refused.error';
import { RunStatus } from '../execution/run-status.enum';
import { StepStatus } from '../execution/step-status.enum';
import { WorkspaceService } from '../workspace/workspace.service';
import { DatabaseCommand } from './database.command';
import { EventPrinter } from './event-printer';
import { MoneyFormatter } from './money.formatter';
import {
  BRANCH_LABEL,
  BUDGET_LABEL,
  CANCELLED_EXIT_CODE,
  COST_LABEL,
  DRY_RUN_MODELS,
  DRY_RUN_NOTICE,
  INVALID_BUDGET_MESSAGE,
  INVALID_MAX_STEPS_MESSAGE,
  MISSING_PROMPT_MESSAGE,
  MODELS_LABEL,
  NOT_AVAILABLE,
  REPORT_LABEL,
  RUN_EXIT_CODE,
  STATUS_LABEL,
  STEPS_LABEL,
  STOPPED_LABEL,
  TOKENS_LABEL,
} from './run.constants';
import type { TeamRunCommandOptions } from './command-options.types';

const PROMPT_INPUT = 0;
const NOTHING = 0;
const SUCCESS_EXIT_CODE = 0;

// Runs a prompt against the whole team: the Orchestrator plans, every step runs the Developer, QA
// and the Reviewer, accepted steps are committed on the run branch, and the run ends with a
// report. Nothing is ever pushed.
@Command({
  name: 'run',
  description: 'Run a prompt against the agent team',
  arguments: '[prompt]',
  argsDescription: {
    prompt: 'the task description, e.g. "add a health endpoint"',
  },
})
export class RunCommand extends DatabaseCommand {
  constructor(
    @Inject(DatabaseBootstrap) bootstrap: DatabaseBootstrap,
    @Inject(WorkspaceService) private readonly workspace: WorkspaceService,
    @Inject(ProjectRepository) private readonly projects: ProjectRepository,
    @Inject(RunRepository) private readonly runs: RunRepository,
    @Inject(PlanExecutor) private readonly executor: PlanExecutor,
    @Inject(CannedAgentInvoker) private readonly canned: CannedAgentInvoker,
    @Inject(EventBus) private readonly events: EventBus,
  ) {
    super(bootstrap);
  }

  async run(inputs: string[], options: TeamRunCommandOptions): Promise<void> {
    const prompt = inputs[PROMPT_INPUT]?.trim();
    if (prompt === undefined || prompt === '') {
      console.error(MISSING_PROMPT_MESSAGE);
      process.exit(RUN_EXIT_CODE);
    }
    const budget = RunCommand.budgetOf(options);
    const maxSteps = RunCommand.maxStepsOf(options);
    await this.ensureDatabase();

    const dryRun = options.dryRun === true;
    const printer = new EventPrinter();
    this.events.subscribe(printer);
    let code = RUN_EXIT_CODE;
    try {
      // Inside the try: describing the models reads the environment, which is also where a
      // missing API key is noticed, and that is a message rather than a stack trace.
      RunCommand.announce(budget, dryRun);
      code = await this.execute(prompt, options, budget, maxSteps, dryRun);
    } catch (error) {
      code = RunCommand.reportFailure(error);
    } finally {
      this.events.unsubscribe(printer);
    }
    process.exit(code);
  }

  @Option({
    flags: '-w, --workspace <path>',
    description: 'workspace directory the agents work in',
  })
  parseWorkspace(value: string): string {
    return value;
  }

  @Option({
    flags: '--no-tui',
    description: 'disable the interactive TUI and print plain text',
  })
  parseNoTui(): boolean {
    return false;
  }

  @Option({
    flags: '--budget <tokens>',
    description: 'how many tokens the run may spend in total',
  })
  parseBudget(value: string): number {
    return Number(value);
  }

  @Option({
    flags: '--max-steps <n>',
    description: 'run at most this many plan steps',
  })
  parseMaxSteps(value: string): number {
    return Number(value);
  }

  @Option({
    flags: '--dry-run',
    description: 'exercise the whole run on canned answers, calling no model',
  })
  parseDryRun(): boolean {
    return true;
  }

  @Option({
    flags: '--yes',
    description: 'do not ask for confirmation of the plan before running the steps',
  })
  parseYes(): boolean {
    return true;
  }

  private async execute(
    prompt: string,
    options: TeamRunCommandOptions,
    budget: number,
    maxSteps: number | undefined,
    dryRun: boolean,
  ): Promise<number> {
    const project = await this.projects.ensure(this.workspace.root, basename(this.workspace.root));
    const run = await this.runs.create({ projectId: project.id, prompt });
    const request: RunRequest = {
      runId: run.id,
      workspacePath: this.workspace.root,
      prompt,
      attended: options.tui !== false,
      autoApprove: options.yes === true,
      tokenBudget: budget,
      maxSteps,
    };
    const outcome = dryRun
      ? await this.executor.execute(request, this.canned)
      : await this.executor.execute(request);
    await this.report(outcome);

    return RunCommand.exitCodeOf(outcome.status);
  }

  // Every number printed here is read back from the database, which is where the run was
  // accounted for, never from what an agent said.
  private async report(outcome: RunOutcome): Promise<void> {
    const totals = await this.runs.recomputeTotals(outcome.runId);
    const accepted = outcome.steps.filter((step) => step.status === StepStatus.Accepted).length;

    console.log('');
    console.log(`${STATUS_LABEL} ${outcome.status}`);
    console.log(`${BRANCH_LABEL} ${outcome.branch ?? NOT_AVAILABLE}`);
    console.log(`${STEPS_LABEL} ${accepted} of ${outcome.steps.length} accepted`);
    console.log(`${REPORT_LABEL} ${outcome.reportPath ?? NOT_AVAILABLE}`);
    console.log(`${TOKENS_LABEL} ${totals.tokensTotal}`);
    console.log(`${COST_LABEL} ${MoneyFormatter.usd(totals.costUsd)}`);
    if (outcome.stoppedReason !== null) {
      console.log(`${STOPPED_LABEL} ${outcome.stoppedReason}`);
    }
  }

  // The budget and the model of every role are printed before the first call, so the cost of the
  // run is visible before it is incurred.
  private static announce(budget: number, dryRun: boolean): void {
    if (dryRun) {
      console.log(DRY_RUN_NOTICE);
    }
    console.log(`${BUDGET_LABEL} ${budget} tokens`);
    console.log(`${MODELS_LABEL} ${dryRun ? DRY_RUN_MODELS : RunCommand.models()}`);
  }

  // Reading the environment here would fail a dry run that has no API key, so the models are only
  // described when a model will really be called.
  private static models(): string {
    return AgentsConfig.describe(AgentsConfig.models(EnvironmentReader.modelEnvironment()));
  }

  private static budgetOf(options: TeamRunCommandOptions): number {
    const { budget } = options;
    if (budget === undefined) {
      return CONSERVATIVE_TOKEN_BUDGET;
    }
    if (!Number.isInteger(budget) || budget <= NOTHING) {
      console.error(INVALID_BUDGET_MESSAGE);
      process.exit(RUN_EXIT_CODE);
    }
    return budget;
  }

  private static maxStepsOf(options: TeamRunCommandOptions): number | undefined {
    const { maxSteps } = options;
    if (maxSteps === undefined) {
      return undefined;
    }
    if (!Number.isInteger(maxSteps) || maxSteps <= NOTHING) {
      console.error(INVALID_MAX_STEPS_MESSAGE);
      process.exit(RUN_EXIT_CODE);
    }
    return maxSteps;
  }

  private static exitCodeOf(status: RunStatus): number {
    if (status === RunStatus.Completed) {
      return SUCCESS_EXIT_CODE;
    }
    return status === RunStatus.Cancelled ? CANCELLED_EXIT_CODE : RUN_EXIT_CODE;
  }

  // A missing API key, or a workspace the run refuses to touch, is a message and an exit code,
  // never a stack trace.
  private static reportFailure(error: unknown): number {
    if (error instanceof ConfigurationError || error instanceof RunRefusedError) {
      console.error(`error: ${error.message}`);
      return RUN_EXIT_CODE;
    }
    throw error;
  }
}
