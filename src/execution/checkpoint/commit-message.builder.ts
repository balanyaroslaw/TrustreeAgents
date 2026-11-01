import type { RunPlan } from '../../agents/orchestrator/plan/run-plan.types';
import type { StepCommitContext } from '../execution.types';
import { RunIdFormatter } from '../run-id.formatter';
import {
  FOOTER_SEPARATOR,
  INITIAL_COMMIT_SUBJECT,
  PLAN_COMMIT_SUBJECT,
  PLAN_STEP_FOOTER_LABEL,
  REPORT_COMMIT_SUBJECT,
  RUN_FOOTER_LABEL,
  STEP_COMMIT_SUBJECT,
} from './commit-message.constants';

const PARAGRAPH_SEPARATOR = '\n\n';
const SINGLE = 1;

export class CommitMessageBuilder {
  static initial(runId: string): string {
    return CommitMessageBuilder.compose([INITIAL_COMMIT_SUBJECT], runId);
  }

  static plan(runId: string, plan: RunPlan): string {
    const steps = plan.steps.length;
    const subject =
      `${PLAN_COMMIT_SUBJECT} ${steps} ` + `step${steps === SINGLE ? '' : 's'} for the run`;

    return CommitMessageBuilder.compose([subject, plan.summary], runId);
  }

  static step(context: StepCommitContext, summary: string): string {
    const subject = `${STEP_COMMIT_SUBJECT} ${context.index}: ${context.title}`;
    const footer =
      `${PLAN_STEP_FOOTER_LABEL} ${context.index} of ${context.total}` +
      `${FOOTER_SEPARATOR}${CommitMessageBuilder.runFooter(context.runId)}`;

    return [subject, summary, footer].filter((part) => part !== '').join(PARAGRAPH_SEPARATOR);
  }

  static report(runId: string): string {
    return CommitMessageBuilder.compose(
      [`${REPORT_COMMIT_SUBJECT} run ${RunIdFormatter.short(runId)}`],
      runId,
    );
  }

  private static compose(parts: readonly string[], runId: string): string {
    return [...parts, CommitMessageBuilder.runFooter(runId)]
      .filter((part) => part !== '')
      .join(PARAGRAPH_SEPARATOR);
  }

  private static runFooter(runId: string): string {
    return `${RUN_FOOTER_LABEL} ${RunIdFormatter.short(runId)}`;
  }
}
