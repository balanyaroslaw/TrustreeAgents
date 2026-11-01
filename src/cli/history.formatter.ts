import { InputSectionRenderer } from '../agents/context/input-section.renderer';
import { DurationFormatter } from '../agents/utils/duration.formatter';
import { CompactNumberFormatter } from '../agents/utils/compact-number.formatter';
import type { StepAttemptRecord } from '../db/repositories/attempt.repository.types';
import type { PlanStepWithAttempts } from '../db/repositories/plan.repository.types';
import type { RunDetail, RunListRow } from '../db/repositories/run.repository.types';
import { RunIdFormatter } from '../execution/run-id.formatter';
import { DateFormatter } from './date.formatter';
import {
  ASSUMPTIONS_HEADER,
  ATTEMPT_LABEL,
  BRANCH_LABEL,
  HISTORY_COLUMNS,
  MAX_PROMPT_CHARACTERS,
  NO_COMMIT,
  NO_DECISION,
  NO_SUMMARY,
  OVERRIDDEN_LABEL,
  PLAN_HEADER,
  REPORT_LABEL,
  RUNNING_DURATION,
  SHORT_SHA_LENGTH,
  STEPS_HEADER,
} from './history.constants';
import { MoneyFormatter } from './money.formatter';
import { TableRenderer } from './table.renderer';

const LINE_SEPARATOR = '\n';
const SECTION_SEPARATOR = '\n\n';
const BULLET = '- ';
const INDENT = '    ';
const FIELD_SEPARATOR = ' | ';
const EMPTY = 0;

export class HistoryFormatter {
  static list(rows: readonly RunListRow[]): string {
    const body = rows.map((row) => [
      RunIdFormatter.short(row.id),
      DateFormatter.short(row.startedAt),
      row.status,
      row.durationMs === null ? RUNNING_DURATION : DurationFormatter.format(row.durationMs),
      `${row.stepsAccepted}/${row.stepsTotal}`,
      CompactNumberFormatter.format(row.tokensTotal),
      MoneyFormatter.usd(row.costUsd),
      InputSectionRenderer.trimmed(row.prompt, MAX_PROMPT_CHARACTERS),
    ]);

    return TableRenderer.render(HISTORY_COLUMNS, body);
  }

  static detail(run: RunDetail): string {
    const sections = [
      [
        `${RunIdFormatter.short(run.id)} ${run.status}`,
        DateFormatter.short(run.startedAt),
        `${CompactNumberFormatter.format(run.tokensTotal)} tokens`,
        MoneyFormatter.usd(run.costUsd),
      ].join(FIELD_SEPARATOR),
      run.prompt,
      HistoryFormatter.facts(run),
      run.planSummary === null ? null : [PLAN_HEADER, run.planSummary].join(LINE_SEPARATOR),
      HistoryFormatter.assumptions(run),
      HistoryFormatter.steps(run.steps),
    ];

    return sections.filter((section) => section !== null).join(SECTION_SEPARATOR);
  }

  private static facts(run: RunDetail): string | null {
    const lines: string[] = [];
    if (run.branch !== null) {
      lines.push(`${BRANCH_LABEL} ${run.branch}`);
    }
    if (run.reportPath !== null) {
      lines.push(`${REPORT_LABEL} ${run.reportPath}`);
    }
    if (run.failureReason !== null) {
      lines.push(run.failureReason);
    }

    return lines.length === EMPTY ? null : lines.join(LINE_SEPARATOR);
  }

  private static assumptions(run: RunDetail): string | null {
    if (run.assumptions.length === EMPTY) {
      return null;
    }
    return [
      ASSUMPTIONS_HEADER,
      ...run.assumptions.map((assumption) => `${BULLET}${assumption}`),
    ].join(LINE_SEPARATOR);
  }

  private static steps(steps: readonly PlanStepWithAttempts[]): string | null {
    if (steps.length === EMPTY) {
      return null;
    }
    const lines = steps.flatMap((step) => [
      `${BULLET}${step.index}. ${step.title} - ${step.status}` +
        `${FIELD_SEPARATOR}${step.commitSha === null ? NO_COMMIT : step.commitSha.slice(EMPTY, SHORT_SHA_LENGTH)}` +
        `${FIELD_SEPARATOR}${step.summary ?? NO_SUMMARY}`,
      ...step.attempts.map(HistoryFormatter.attempt),
    ]);

    return [STEPS_HEADER, ...lines].join(LINE_SEPARATOR);
  }

  private static attempt(attempt: StepAttemptRecord): string {
    const decision = attempt.effectiveDecision ?? NO_DECISION;
    const overridden = attempt.overridden ? `${FIELD_SEPARATOR}${OVERRIDDEN_LABEL}` : '';

    return (
      `${INDENT}${ATTEMPT_LABEL} ${attempt.attempt}: ${decision}${overridden}` +
      `${FIELD_SEPARATOR}${CompactNumberFormatter.format(attempt.tokensTotal)} tokens` +
      `${FIELD_SEPARATOR}${MoneyFormatter.usd(attempt.costUsd)}` +
      `${FIELD_SEPARATOR}${DurationFormatter.format(attempt.durationMs)}`
    );
  }
}
