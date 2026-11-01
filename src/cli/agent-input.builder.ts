import { Inject, Injectable } from '@nestjs/common';
import { AgentRole } from '../agents/agent-role.enum';
import { DeveloperInputRenderer } from '../agents/context/developer-input.renderer';
import { QaInputRenderer } from '../agents/context/qa-input.renderer';
import { ReviewInputRenderer } from '../agents/context/review-input.renderer';
import type { PlanStepContext } from '../agents/context/step-context.types';
import { OrchestratorTask } from '../agents/orchestrator/orchestrator-task.enum';
import { PlanInputRenderer } from '../agents/orchestrator/plan/plan-input.renderer';
import type { CallTarget } from '../sdk/call-scope.types';
import type { ChangedFile } from '../workspace/git/changed-file.types';
import { GitService } from '../workspace/git/git.service';
import { GIT_DEFAULT_BASE_REF } from '../workspace/git/git.constants';
import { WorkspaceSurveyor } from '../execution/workspace.surveyor';
import { SINGLE_ATTEMPT, SINGLE_STEP_INDEX, SINGLE_STEP_TOTAL } from './agent-command.constants';
import type { AgentRunInput } from './agent-run.types';

// Builds the simplest honest input for one agent: a one-step plan whose title, description and
// single acceptance criterion are the task the user typed, plus what git says changed.
@Injectable()
export class AgentInputBuilder {
  constructor(
    @Inject(GitService) private readonly git: GitService,
    @Inject(WorkspaceSurveyor) private readonly surveyor: WorkspaceSurveyor,
  ) {}

  async build(target: CallTarget, task: string): Promise<AgentRunInput> {
    if (target.task === OrchestratorTask.Plan) {
      const survey = await this.surveyor.survey();
      return {
        inputText: PlanInputRenderer.render({
          userPrompt: task,
          isExistingProject: survey.isExistingProject,
          workspaceDocuments: survey.documents,
          previousQuestionsAndAnswers: [],
        }),
        step: null,
        changedCode: [],
      };
    }

    const step = AgentInputBuilder.stepOf(task);
    const changedCode = await this.changedFiles();

    return { inputText: this.renderFor(target, step, changedCode), step, changedCode };
  }

  async changedFiles(): Promise<readonly ChangedFile[]> {
    try {
      return await this.git.changedFiles(GIT_DEFAULT_BASE_REF);
    } catch {
      // A folder that is not a repository yet, or a repository without commits.
      return [];
    }
  }

  private renderFor(
    target: CallTarget,
    step: PlanStepContext,
    changedCode: readonly ChangedFile[],
  ): string {
    if (target.role === AgentRole.Developer) {
      return DeveloperInputRenderer.render({
        step,
        completedSteps: [],
        attempt: SINGLE_ATTEMPT,
        maxAttempts: SINGLE_ATTEMPT,
        reworkBrief: null,
        systemNote: null,
        changedCode: [],
      });
    }
    if (target.role === AgentRole.Qa) {
      return QaInputRenderer.render({
        step,
        changedCode,
        developerNotes: null,
        brief: null,
        completedSteps: [],
        attempt: SINGLE_ATTEMPT,
        maxAttempts: SINGLE_ATTEMPT,
        previousDefects: [],
      });
    }
    return ReviewInputRenderer.render({
      step,
      changedCode,
      developerNotes: null,
      qaFacts: null,
      completedSteps: [],
      attempt: SINGLE_ATTEMPT,
      maxAttempts: SINGLE_ATTEMPT,
      previousIssues: [],
    });
  }

  private static stepOf(task: string): PlanStepContext {
    return {
      index: SINGLE_STEP_INDEX,
      total: SINGLE_STEP_TOTAL,
      title: task,
      description: task,
      acceptanceCriteria: [task],
    };
  }
}
