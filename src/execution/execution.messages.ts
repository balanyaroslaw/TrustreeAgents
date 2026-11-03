import type { AgentRole } from '../agents/agent-role.enum';
import type { OrchestratorTask } from '../agents/orchestrator/orchestrator-task.enum';
import type { AgentFailureKind } from './agents/agent-failure.enum';
import { MAX_LISTED_DIRTY_PATHS } from './execution.constants';

const NAME_SEPARATOR = ', ';
const SINGLE = 1;
const START = 0;
const NONE = 0;

// Every sentence the executor records about a run: the reasons a run stopped, and the notes a
// rework carries. They are facts observed by the code, so they are written in one place.
export class ExecutionMessages {
  static workspaceMismatch(requested: string, root: string): string {
    return (
      `the run was requested for "${requested}" but the workspace is rooted at "${root}". ` +
      'Start the run in the workspace you want to change'
    );
  }

  static dirtyWorktree(paths: readonly string[]): string {
    const shown = paths.slice(START, MAX_LISTED_DIRTY_PATHS);
    const more = paths.length - shown.length;
    const listed =
      more > NONE ? `${shown.join(NAME_SEPARATOR)}, and ${more} more` : shown.join(NAME_SEPARATOR);

    return (
      `the workspace has ${ExecutionMessages.count(paths.length, 'uncommitted change')} ` +
      `(${listed}). Commit or stash your changes first`
    );
  }

  static planQuestionsRemain(questions: readonly string[]): string {
    return (
      'the Orchestrator still asks for answers after the second planning attempt: ' +
      questions.join(NAME_SEPARATOR)
    );
  }

  static noChangedFiles(): string {
    return (
      'no file in the workspace changed during the attempt, so there was nothing to test or ' +
      'review. Implement the step by editing files'
    );
  }

  static developerBlocked(openIssues: readonly string[]): string {
    const issues = openIssues.length === 0 ? 'no reason given' : openIssues.join(NAME_SEPARATOR);
    return `the Developer reported itself blocked and changed no file: ${issues}`;
  }

  static agentOutOfTurns(role: AgentRole): string {
    return `${role} ran out of turns before it finished, so its work is incomplete`;
  }

  static agentHitTokenCap(role: AgentRole, spent: number): string {
    return (
      `${role} was stopped after spending ${spent} tokens on one call, which is more than a ` +
      'single call may spend, so its work is incomplete'
    );
  }

  static agentInvalidOutput(role: AgentRole): string {
    return `${role} did not return a valid structured answer, not even on the retry`;
  }

  static orchestratorCallFailed(task: OrchestratorTask, kind: AgentFailureKind): string {
    return `the Orchestrator task "${task}" failed (${kind}), so the run cannot continue`;
  }

  static agentCallFailed(role: AgentRole, kind: AgentFailureKind, detail: string): string {
    return `the call to ${role} failed (${kind}): ${detail}`;
  }

  static incompleteAttempt(): string {
    return 'the attempt did not produce all three reports, so no decision could be taken';
  }

  static attemptLimit(attempts: number): string {
    return `the step was not accepted within ${ExecutionMessages.count(attempts, 'attempt')}`;
  }

  static budgetExhausted(spent: number, limit: number): string {
    return `the token budget is spent: ${spent} of ${limit} tokens used`;
  }

  static budgetTooSmall(remaining: number, reserve: number): string {
    return (
      `the remaining budget of ${remaining} tokens is below the ${reserve} tokens an agent ` +
      'call needs, so the run stops here'
    );
  }

  static cancelled(): string {
    return 'the run was cancelled before it finished';
  }

  static stepFailedRun(index: number, reason: string): string {
    return `step ${index} failed, and later steps build on it: ${reason}`;
  }

  static skippedAfterFailure(index: number): string {
    return `not started because step ${index} failed`;
  }

  static skippedOverStepLimit(maxSteps: number): string {
    return `not started: the plan has more steps than the --max-steps limit of ${maxSteps}`;
  }

  static stepLimitReached(planned: number, maxSteps: number): string {
    return (
      `the plan has ${ExecutionMessages.count(planned, 'step')} but --max-steps allows ` +
      `${maxSteps}, so the steps after ${maxSteps} were not started`
    );
  }

  static confirmPlan(): string {
    return 'Run these steps? Each step calls the Developer, QA and the Reviewer. [y/N]';
  }

  static planRejected(): string {
    return 'the plan was not confirmed, so no step was started';
  }

  static nothingToCommit(): string {
    return 'the step was accepted but changed no file, so there is no commit';
  }

  static briefSkipped(): string {
    return 'the QA brief was skipped to save budget';
  }

  static summarySkipped(): string {
    return 'the run summary was skipped: no budget left for it';
  }

  static coverageSummary(covered: number, total: number): string {
    return `${covered} of ${total} acceptance criteria covered by tests`;
  }

  private static count(value: number, noun: string): string {
    return `${value} ${noun}${value === SINGLE ? '' : 's'}`;
  }
}
