import { Inject, Injectable } from '@nestjs/common';
import { AgentRole } from '../agents/agent-role.enum';
import { DeveloperReportBuilder } from '../agents/developer/developer-report.builder';
import { DeveloperReportFormatter } from '../agents/developer/developer-report.formatter';
import type { DeveloperResult } from '../agents/developer/developer-result.types';
import { OrchestratorTask } from '../agents/orchestrator/orchestrator-task.enum';
import { PlanFormatter } from '../agents/orchestrator/plan/plan.formatter';
import type { RunPlan } from '../agents/orchestrator/plan/run-plan.types';
import { QaReportBuilder } from '../agents/qa/qa-report.builder';
import { QaReportFormatter } from '../agents/qa/qa-report.formatter';
import type { QaResult } from '../agents/qa/qa-result.types';
import { TestFileDiffCollector } from '../agents/qa/test-file-diff.collector';
import { ReviewReportBuilder } from '../agents/reviewer/review-report.builder';
import { ReviewReportFormatter } from '../agents/reviewer/review-report.formatter';
import type { ReviewResult } from '../agents/reviewer/review-result.types';
import type { AgentInvocation } from '../execution/agents/agent-invocation.types';
import type { CallTarget } from '../sdk/call-scope.types';
import type { ChangedFile } from '../workspace/git/changed-file.types';
import { GIT_DEFAULT_BASE_REF } from '../workspace/git/git.constants';
import type { AgentRunInput } from './agent-run.types';

// Prints the result of one agent with the formatter that agent's report already has, so the
// single-agent checkpoint shows exactly what the pipeline will show.
@Injectable()
export class AgentReportPrinter {
  constructor(@Inject(TestFileDiffCollector) private readonly testDiffs: TestFileDiffCollector) {}

  async print(
    target: CallTarget,
    invocation: AgentInvocation<unknown>,
    input: AgentRunInput,
    changedAfter: readonly ChangedFile[],
  ): Promise<void> {
    if (target.task === OrchestratorTask.Plan) {
      console.log(PlanFormatter.terminal(invocation.output as RunPlan));
      return;
    }
    if (target.role === AgentRole.Developer) {
      console.log(AgentReportPrinter.developer(invocation));
      return;
    }
    if (target.role === AgentRole.Qa) {
      console.log(await this.qa(invocation, input, changedAfter));
      return;
    }
    console.log(AgentReportPrinter.reviewer(invocation, changedAfter));
  }

  private static developer(invocation: AgentInvocation<unknown>): string {
    return DeveloperReportFormatter.format(
      DeveloperReportBuilder.build(
        invocation.output as DeveloperResult,
        invocation.changes,
        invocation.usage,
        invocation.toolCalls,
        invocation.durationMs,
      ),
    );
  }

  private async qa(
    invocation: AgentInvocation<unknown>,
    input: AgentRunInput,
    changedAfter: readonly ChangedFile[],
  ): Promise<string> {
    return QaReportFormatter.format(
      QaReportBuilder.build(
        invocation.output as QaResult,
        input.changedCode,
        invocation.commandRuns,
        invocation.changes,
        invocation.usage,
        invocation.toolCalls,
        invocation.durationMs,
        await this.testDiffs.collect(GIT_DEFAULT_BASE_REF, changedAfter),
      ),
    );
  }

  private static reviewer(
    invocation: AgentInvocation<unknown>,
    changedAfter: readonly ChangedFile[],
  ): string {
    return ReviewReportFormatter.format(
      ReviewReportBuilder.build(
        invocation.output as ReviewResult,
        changedAfter,
        invocation.readPaths,
        invocation.usage,
        invocation.toolCalls,
        invocation.durationMs,
      ),
    );
  }
}
