import type { DeferredIssue } from '../../agents/orchestrator/decide/step-decision.types';
import type {
  RunSummary,
  UnfinishedWork,
} from '../../agents/orchestrator/summarize/run-summary.types';
import { DurationFormatter } from '../../agents/utils/duration.formatter';
import { RunDiagnosisFormatter } from '../diagnosis/run-diagnosis.formatter';
import {
  AGENT_TABLE_HEADER,
  AGENT_TABLE_RULE,
  ASSUMPTIONS_HEADER,
  ATTEMPTS_LABEL,
  BRANCH_LABEL,
  COMMIT_LABEL,
  CUT_OFF_ATTEMPT_LABEL,
  CUT_OFF_LABEL,
  CUT_OFF_TOKENS_LABEL,
  DEFERRED_HEADER,
  DURATION_LABEL,
  FOLLOW_UPS_HEADER,
  METRICS_HEADER,
  NOTE_LABEL,
  NOT_DONE_HEADER,
  NO_BRANCH,
  NO_COMMIT,
  OVERRIDES_LABEL,
  OVERVIEW_HEADER,
  PLAN_HEADER,
  QA_LABEL,
  QUESTIONS_HEADER,
  REASON_LABEL,
  REPORT_TITLE_PREFIX,
  REQUEST_HEADER,
  REVIEW_LABEL,
  STATUS_LABEL,
  STEPS_HEADER,
  STEP_TABLE_HEADER,
  STEP_TABLE_RULE,
  SUMMARY_LABEL,
  TOKENS_LABEL,
  WHY_IT_FAILED_HEADER,
} from './run-report.constants';
import type { RunReport, RunReportCutOffCall, RunReportStep } from './run-report.types';

const SECTION_SEPARATOR = '\n\n';
const LINE_SEPARATOR = '\n';
const BULLET = '- ';
const ENTRY_SEPARATOR = '; ';
const COLUMN_SEPARATOR = ' | ';
const NOT_AVAILABLE = 'n/a';
const EMPTY = 0;

// Writes reports/run-<short id>.md: the one place a human reads what the run did.
export class RunReportFormatter {
  static format(report: RunReport): string {
    const sections = [
      `${REPORT_TITLE_PREFIX} ${report.shortId}`,
      RunReportFormatter.facts(report),
      [REQUEST_HEADER, report.prompt.trim()].join(SECTION_SEPARATOR),
      RunReportFormatter.plan(report),
      RunReportFormatter.questions(report),
      RunReportFormatter.whyItFailed(report),
      RunReportFormatter.steps(report),
      RunReportFormatter.deferred(report.deferredIssues),
      RunReportFormatter.overview(report.summary),
      RunReportFormatter.notDone(report.summary),
      RunReportFormatter.followUps(report.summary),
      RunReportFormatter.metrics(report),
    ];

    return sections.filter((section) => section !== null).join(SECTION_SEPARATOR) + LINE_SEPARATOR;
  }

  private static facts(report: RunReport): string {
    const lines = [
      `${BULLET}${BRANCH_LABEL}: ${report.branch ?? NO_BRANCH}`,
      `${BULLET}${STATUS_LABEL}: ${report.status}`,
      `${BULLET}${DURATION_LABEL}: ${DurationFormatter.format(report.durationMs)}`,
      `${BULLET}${TOKENS_LABEL}: ${report.metrics.tokensTotal} of ${report.metrics.tokenBudget}`,
    ];
    if (report.stoppedReason !== null) {
      lines.push(`${BULLET}${REASON_LABEL}: ${report.stoppedReason}`);
    }

    return lines.join(LINE_SEPARATOR);
  }

  private static plan(report: RunReport): string | null {
    if (report.planSummary === '' && report.assumptions.length === EMPTY) {
      return null;
    }
    const sections = [[PLAN_HEADER, report.planSummary].join(SECTION_SEPARATOR)];
    if (report.assumptions.length > EMPTY) {
      sections.push(
        [
          ASSUMPTIONS_HEADER,
          ...report.assumptions.map((assumption) => `${BULLET}${assumption}`),
        ].join(LINE_SEPARATOR),
      );
    }

    return sections.join(SECTION_SEPARATOR);
  }

  private static questions(report: RunReport): string | null {
    if (report.questions.length === EMPTY) {
      return null;
    }
    return [QUESTIONS_HEADER, ...report.questions.map((question) => `${BULLET}${question}`)].join(
      LINE_SEPARATOR,
    );
  }

  // Before the steps, because it is the first thing a person asks of a run that did not finish.
  // The same text the terminal printed: both come from RunDiagnosisFormatter.
  private static whyItFailed(report: RunReport): string | null {
    const { diagnosis } = report;

    return diagnosis === null
      ? null
      : [WHY_IT_FAILED_HEADER, RunDiagnosisFormatter.format(diagnosis)].join(SECTION_SEPARATOR);
  }

  private static steps(report: RunReport): string | null {
    if (report.steps.length === EMPTY) {
      return null;
    }
    return [STEPS_HEADER, ...report.steps.map(RunReportFormatter.step)].join(SECTION_SEPARATOR);
  }

  private static step(step: RunReportStep): string {
    const lines = [
      `### ${step.index}. ${step.title} - ${step.status}`,
      `${BULLET}${ATTEMPTS_LABEL}: ${step.attempts}`,
    ];
    if (step.summary !== '') {
      lines.push(`${BULLET}${SUMMARY_LABEL}: ${step.summary}`);
    }
    lines.push(`${BULLET}${COMMIT_LABEL}: ${step.commitSha ?? NO_COMMIT}`);
    lines.push(
      `${BULLET}${QA_LABEL}: ${step.qaStatus ?? NOT_AVAILABLE}` +
        `${COLUMN_SEPARATOR}${REVIEW_LABEL}: ${step.reviewVerdict ?? NOT_AVAILABLE}` +
        `${COLUMN_SEPARATOR}${TOKENS_LABEL}: ${step.tokens}`,
    );
    if (step.overrideReasons.length > EMPTY) {
      lines.push(`${BULLET}${OVERRIDES_LABEL}: ${step.overrideReasons.join(ENTRY_SEPARATOR)}`);
    }
    if (step.cutOffCalls.length > EMPTY) {
      lines.push(
        `${BULLET}${CUT_OFF_LABEL}: ` +
          `${step.cutOffCalls.map(RunReportFormatter.cutOff).join(ENTRY_SEPARATOR)}`,
      );
    }
    if (step.failureReason !== null) {
      lines.push(`${BULLET}${REASON_LABEL}: ${step.failureReason}`);
    }
    if (step.note !== null) {
      lines.push(`${BULLET}${NOTE_LABEL}: ${step.note}`);
    }

    return lines.join(LINE_SEPARATOR);
  }

  // Said plainly, because a report that was cut off is not the same as one the agent finished.
  private static cutOff(call: RunReportCutOffCall): string {
    const attempt = call.attempt === null ? '' : ` in ${CUT_OFF_ATTEMPT_LABEL} ${call.attempt}`;

    return (
      `${call.agent} stopped on ${call.reason}${attempt} after ${call.tokens} ` +
      `${CUT_OFF_TOKENS_LABEL}`
    );
  }

  private static deferred(issues: readonly DeferredIssue[]): string | null {
    if (issues.length === EMPTY) {
      return null;
    }
    return [
      DEFERRED_HEADER,
      ...issues.map((issue) => `${BULLET}${issue.issue} (${issue.reason})`),
    ].join(LINE_SEPARATOR);
  }

  private static overview(summary: RunSummary | null): string | null {
    return summary === null ? null : [OVERVIEW_HEADER, summary.overview].join(SECTION_SEPARATOR);
  }

  private static notDone(summary: RunSummary | null): string | null {
    if (summary === null || summary.notDone.length === EMPTY) {
      return null;
    }
    return [NOT_DONE_HEADER, ...summary.notDone.map(RunReportFormatter.unfinished)].join(
      LINE_SEPARATOR,
    );
  }

  private static unfinished(entry: UnfinishedWork): string {
    return `${BULLET}${entry.what}: ${entry.reason}`;
  }

  private static followUps(summary: RunSummary | null): string | null {
    if (summary === null || summary.followUps.length === EMPTY) {
      return null;
    }
    return [FOLLOW_UPS_HEADER, ...summary.followUps.map((item) => `${BULLET}${item}`)].join(
      LINE_SEPARATOR,
    );
  }

  private static metrics(report: RunReport): string {
    const { metrics } = report;
    const sections = [
      [
        METRICS_HEADER,
        `${BULLET}${metrics.agentCalls} agent calls, ${metrics.toolCalls} tool calls, ` +
          `${metrics.commandRuns} commands run`,
      ].join(SECTION_SEPARATOR),
    ];

    if (metrics.byAgent.length > EMPTY) {
      sections.push(
        [
          AGENT_TABLE_HEADER,
          AGENT_TABLE_RULE,
          ...metrics.byAgent.map(
            (entry) =>
              `| ${entry.agent} | ${entry.calls} | ${entry.tokens} | ${entry.toolCalls} | ` +
              `${entry.commandRuns} |`,
          ),
        ].join(LINE_SEPARATOR),
      );
    }
    if (metrics.byStep.length > EMPTY) {
      sections.push(
        [
          STEP_TABLE_HEADER,
          STEP_TABLE_RULE,
          ...metrics.byStep.map(
            (entry) =>
              `| ${entry.index} | ${entry.tokens} | ${entry.toolCalls} | ${entry.commandRuns} |`,
          ),
        ].join(LINE_SEPARATOR),
      );
    }

    return sections.join(SECTION_SEPARATOR);
  }
}
