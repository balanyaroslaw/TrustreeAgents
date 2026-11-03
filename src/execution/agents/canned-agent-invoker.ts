import { Inject, Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { AgentRole } from '../../agents/agent-role.enum';
import { AgentCallRepository } from '../../db/repositories/agent-call.repository';
import type { QaBrief } from '../../agents/context/qa-brief.types';
import { DeveloperStatus } from '../../agents/developer/developer-status.enum';
import type { DeveloperResult } from '../../agents/developer/developer-result.types';
import { StepDecisionKind } from '../../agents/orchestrator/decide/step-decision.enum';
import type { StepDecision } from '../../agents/orchestrator/decide/step-decision.types';
import { OrchestratorTask } from '../../agents/orchestrator/orchestrator-task.enum';
import type { RunPlan } from '../../agents/orchestrator/plan/run-plan.types';
import type { RunSummary } from '../../agents/orchestrator/summarize/run-summary.types';
import { CoverageLevel } from '../../agents/qa/coverage-level.enum';
import type { QaResult } from '../../agents/qa/qa-result.types';
import type { ReviewResult } from '../../agents/reviewer/review-result.types';
import { ChecklistItem } from '../../agents/reviewer/checklist-item.enum';
import { ChecklistStatus } from '../../agents/reviewer/checklist-status.enum';
import { ReviewDimension } from '../../agents/reviewer/review-dimension.enum';
import { ChangeAction } from '../../workspace/activity/change-action.enum';
import type { TrackedChange } from '../../workspace/activity/tracked-change.types';
import type { CommandRunRecord } from '../../workspace/commands/command-run.types';
import { AtomicFileWriter } from '../../workspace/io/atomic-file.writer';
import { WorkspaceService } from '../../workspace/workspace.service';
import type { AgentInvocation, AgentUsage } from './agent-invocation.types';
import type { AgentInvokerFactory, InvokerScope } from './agent-invoker-factory.port.types';
import type { AgentInvoker } from './agent-invoker.port.types';
import {
  CANNED_CHANGE_SEQUENCE,
  CANNED_MODEL,
  CANNED_DURATION_MS,
  CANNED_EXIT_CODE,
  CANNED_FULL_TEST_COMMAND,
  CANNED_PLAN_STEPS,
  CANNED_RUN_SEQUENCE,
  CANNED_SCORE,
  CANNED_SOURCE_FILE,
  CANNED_TEST_FILE,
  CANNED_TEST_OUTPUT_TAIL,
  CANNED_TOOL_CALLS,
} from './canned-invoker.constants';

const NO_TOKENS = 0;
const FIRST_CALL = 1;
const LINE_BREAK = '\n';

// What `team run --dry-run` uses instead of a model: it calls nothing, spends nothing, and
// returns answers that satisfy the output schemas, so the loop, the decisions, the commits and
// the report can be exercised for free. The Developer and QA answers are backed by real file
// writes, so git sees a real diff per step.
//
// Every call is still written to agent_calls, with the dry-run model and zero tokens, so the
// attribution of calls to attempts is exercised for free and `usage --by step` shows the shape a
// real run would have.
//
// It is its own factory and keeps the scope it was last asked for: a run calls its agents one at
// a time, and one process runs one run, so there is never a second scope in flight.
@Injectable()
export class CannedAgentInvoker implements AgentInvoker, AgentInvokerFactory {
  private developerCalls = NO_TOKENS;
  private scope: InvokerScope | null = null;

  constructor(
    @Inject(WorkspaceService) private readonly workspace: WorkspaceService,
    @Inject(AgentCallRepository) private readonly calls: AgentCallRepository,
  ) {}

  forScope(scope: InvokerScope): AgentInvoker {
    this.scope = scope;
    return this;
  }

  async invokeAgent<TOutput>(
    role: AgentRole,
    inputText: string,
  ): Promise<AgentInvocation<TOutput>> {
    const invocation = await this.agentInvocation<TOutput>(role, inputText);
    await this.record(role, null);

    return invocation;
  }

  async invokeOrchestrator<TOutput>(task: OrchestratorTask): Promise<AgentInvocation<TOutput>> {
    const output = CannedAgentInvoker.orchestratorOutput(task);
    await this.record(AgentRole.Orchestrator, task);

    return CannedAgentInvoker.invocation<TOutput>(output as TOutput, [], [], []);
  }

  private async agentInvocation<TOutput>(
    role: AgentRole,
    inputText: string,
  ): Promise<AgentInvocation<TOutput>> {
    if (role === AgentRole.Developer) {
      return this.developer<TOutput>();
    }
    if (role === AgentRole.Qa) {
      return this.qa<TOutput>();
    }

    return CannedAgentInvoker.invocation<TOutput>(
      CannedAgentInvoker.review(inputText) as TOutput,
      [],
      [],
      [CANNED_SOURCE_FILE, CANNED_TEST_FILE],
    );
  }

  // The same row a real call writes, priced at zero: the model is named dry-run, so a dry run can
  // never be mistaken for a paid one in the accounting.
  private async record(role: AgentRole, task: OrchestratorTask | null): Promise<void> {
    const scope = this.scope;
    if (scope === null) {
      return;
    }
    await this.calls.record({
      runId: scope.runId,
      attemptId: scope.attemptId ?? null,
      role,
      task,
      model: CANNED_MODEL,
      inputTokens: NO_TOKENS,
      cachedInputTokens: NO_TOKENS,
      outputTokens: NO_TOKENS,
      toolCalls: CANNED_TOOL_CALLS,
      durationMs: CANNED_DURATION_MS,
    });
  }

  // One real write per step: the first call creates the file, later calls append to it, so every
  // step of the canned plan has something of its own to commit.
  private async developer<TOutput>(): Promise<AgentInvocation<TOutput>> {
    this.developerCalls += FIRST_CALL;
    const line = `export const DRY_RUN_STEP_${this.developerCalls} = ${this.developerCalls};`;
    const previous = this.developerCalls === FIRST_CALL ? '' : await this.read(CANNED_SOURCE_FILE);
    await this.write(CANNED_SOURCE_FILE, `${previous}${line}${LINE_BREAK}`);

    const result: DeveloperResult = {
      status: DeveloperStatus.Completed,
      summary:
        'Added a constant for this step to the dry-run module. No model was called: this is the ' +
        'canned Developer answer used by --dry-run to exercise the pipeline.',
      changes: [
        {
          path: CANNED_SOURCE_FILE,
          action: this.developerCalls === FIRST_CALL ? ChangeAction.Created : ChangeAction.Modified,
          description: 'Holds the constant this dry-run step contributes.',
        },
      ],
      decisions: [],
      openIssues: [],
    };

    return CannedAgentInvoker.invocation<TOutput>(result as TOutput, [], [], []);
  }

  // The canned QA writes its test file and reports a passing full suite, so the report builder
  // sees the facts a real passing QA run would leave behind.
  private async qa<TOutput>(): Promise<AgentInvocation<TOutput>> {
    await this.write(
      CANNED_TEST_FILE,
      `// Canned dry-run test for ${CANNED_SOURCE_FILE}.${LINE_BREAK}`,
    );

    const result: QaResult = {
      summary:
        'Wrote one test file for the changed module and ran the full suite, which passed. No ' +
        'model was called: this is the canned QA answer used by --dry-run.',
      fullSuiteCommand: CANNED_FULL_TEST_COMMAND,
      coverage: [],
      fileCoverage: [{ path: CANNED_SOURCE_FILE, level: CoverageLevel.Covered, tests: [] }],
      testFiles: [
        {
          path: CANNED_TEST_FILE,
          description: 'Covers the constant the dry-run step added.',
        },
      ],
      defects: [],
      notTested: [],
      outOfScope: [],
      flakyTests: [],
    };
    const changes: readonly TrackedChange[] = [
      {
        path: CANNED_TEST_FILE,
        action: ChangeAction.Created,
        sequence: CANNED_CHANGE_SEQUENCE,
      },
    ];
    const runs: readonly CommandRunRecord[] = [
      {
        command: CANNED_FULL_TEST_COMMAND,
        cwd: this.workspace.root,
        exitCode: CANNED_EXIT_CODE,
        timedOut: false,
        durationMs: CANNED_DURATION_MS,
        outputTail: CANNED_TEST_OUTPUT_TAIL,
        sequence: CANNED_RUN_SEQUENCE,
      },
    ];

    return CannedAgentInvoker.invocation<TOutput>(result as TOutput, changes, runs, []);
  }

  private async write(relativePath: string, content: string): Promise<void> {
    await AtomicFileWriter.replace(await this.workspace.resolveSafe(relativePath), content);
  }

  private async read(relativePath: string): Promise<string> {
    try {
      return await readFile(await this.workspace.resolveSafe(relativePath), 'utf8');
    } catch {
      return '';
    }
  }

  private static orchestratorOutput(task: OrchestratorTask): unknown {
    if (task === OrchestratorTask.Plan) {
      return CannedAgentInvoker.plan();
    }
    if (task === OrchestratorTask.Brief) {
      return CannedAgentInvoker.brief();
    }
    if (task === OrchestratorTask.Decide) {
      return CannedAgentInvoker.decision();
    }

    return CannedAgentInvoker.summary();
  }

  private static plan(): RunPlan {
    return {
      clarifyingQuestions: [],
      summary:
        'A canned two-step plan for --dry-run. No model was called, so the steps describe the ' +
        'dry-run module rather than the prompt.',
      steps: Array.from({ length: CANNED_PLAN_STEPS }, (_unused, position) => ({
        title: `Dry-run step ${position + FIRST_CALL}`,
        description: `Add the constant of dry-run step ${position + FIRST_CALL}.`,
        acceptanceCriteria: [`${CANNED_SOURCE_FILE} exports the constant of this step`],
      })),
      assumptions: ['The run is a dry run, so no model was asked anything.'],
    };
  }

  private static brief(): QaBrief {
    return { focus: [], risks: [], changedInterfaces: [] };
  }

  private static decision(): StepDecision {
    return {
      decision: StepDecisionKind.Accept,
      reason:
        'The canned QA run passed and the canned review found no blocking issue, so the step is ' +
        'accepted. No model was called.',
      reworkFocus: [],
      deferredIssues: [],
      stepSummary: 'Added the dry-run constant for this step.',
    };
  }

  private static summary(): RunSummary {
    return {
      overview:
        'A dry run: every step was accepted on canned answers, no model was called and nothing ' +
        'was spent.',
      notDone: [],
      followUps: [],
    };
  }

  private static review(inputText: string): ReviewResult {
    return {
      summary:
        'The change adds one exported constant and a test file for it. It matches the step and ' +
        'carries no risk. No model was called: this is the canned review used by --dry-run. ' +
        `The input was ${inputText.length} characters long.`,
      criteriaAssessment: [],
      checklist: Object.values(ChecklistItem).map((item) => ({
        item,
        status: ChecklistStatus.NotApplicable,
        note: 'A dry run changes nothing that this item covers.',
      })),
      issues: [],
      scores: {
        correctness: CANNED_SCORE,
        paymentSafety: CANNED_SCORE,
        maintainability: CANNED_SCORE,
        testQuality: CANNED_SCORE,
        justifications: Object.fromEntries(
          Object.values(ReviewDimension).map((dimension) => [
            dimension,
            'Canned score: no model judged this.',
          ]),
        ) as Record<ReviewDimension, string>,
      },
      strengths: [],
      outOfScope: [],
      notReviewed: [],
    };
  }

  private static invocation<TOutput>(
    output: TOutput,
    changes: readonly TrackedChange[],
    commandRuns: readonly CommandRunRecord[],
    readPaths: readonly string[],
  ): AgentInvocation<TOutput> {
    const usage: AgentUsage = {
      input: NO_TOKENS,
      cachedInput: NO_TOKENS,
      output: NO_TOKENS,
      total: NO_TOKENS,
    };

    return {
      output,
      usage,
      toolCalls: CANNED_TOOL_CALLS,
      durationMs: CANNED_DURATION_MS,
      changes,
      commandRuns,
      readPaths,
    };
  }
}
