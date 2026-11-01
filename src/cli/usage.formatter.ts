import type {
  StepUsageRow,
  UsageRow,
  UsageTotals,
} from '../db/repositories/agent-call.repository.types';
import type { RunDetail } from '../db/repositories/run.repository.types';
import { DatabaseMessages } from '../db/db.messages';
import { CompactNumberFormatter } from '../agents/utils/compact-number.formatter';
import { DurationFormatter } from '../agents/utils/duration.formatter';
import { DateFormatter } from './date.formatter';
import { MoneyFormatter } from './money.formatter';
import { TableRenderer } from './table.renderer';
import {
  AGENT_USAGE_COLUMNS,
  MODEL_USAGE_COLUMNS,
  NO_ATTEMPTS,
  NO_STATUS,
  RUN_HEADER_LABEL,
  STARTED_LABEL,
  STATUS_LABEL,
  STEP_USAGE_COLUMNS,
  TOTAL_LABEL,
} from './usage.constants';
import { RunIdFormatter } from '../execution/run-id.formatter';

const LINE_SEPARATOR = '\n';
const SECTION_SEPARATOR = '\n\n';
const FIELD_SEPARATOR = ' | ';
const EMPTY = 0;

export class UsageFormatter {
  static header(run: RunDetail): string {
    return [
      `${RUN_HEADER_LABEL} ${RunIdFormatter.short(run.id)}`,
      `${STATUS_LABEL} ${run.status}`,
      `${STARTED_LABEL} ${DateFormatter.short(run.startedAt)}`,
      run.prompt,
    ].join(FIELD_SEPARATOR);
  }

  static byAgent(rows: readonly UsageRow[], totals: UsageTotals): string {
    const body = rows.map((row) => [row.label, row.model, ...UsageFormatter.numbers(row)]);
    body.push([TOTAL_LABEL, '', ...UsageFormatter.totalNumbers(totals)]);

    return TableRenderer.render(AGENT_USAGE_COLUMNS, body);
  }

  // The rows come grouped by model from the database, so the money is summed as Decimal there.
  static byModel(rows: readonly UsageRow[], totals: UsageTotals): string {
    const body = rows.map((row) => [row.model, ...UsageFormatter.numbers(row)]);
    body.push([TOTAL_LABEL, ...UsageFormatter.totalNumbers(totals)]);

    return TableRenderer.render(MODEL_USAGE_COLUMNS, body);
  }

  static byStep(rows: readonly StepUsageRow[], totals: UsageTotals): string {
    const body = rows.map((row) => [
      row.label,
      row.status ?? NO_STATUS,
      row.attempts === EMPTY ? NO_ATTEMPTS : String(row.attempts),
      row.model,
      ...UsageFormatter.numbers(row),
    ]);
    body.push([TOTAL_LABEL, '', '', '', ...UsageFormatter.totalNumbers(totals)]);

    return TableRenderer.render(STEP_USAGE_COLUMNS, body);
  }

  static footer(missingPrices: readonly string[]): string | null {
    return missingPrices.length === EMPTY ? null : DatabaseMessages.missingPrices(missingPrices);
  }

  static lines(parts: readonly (string | null)[]): string {
    return parts.filter((part) => part !== null).join(SECTION_SEPARATOR) + LINE_SEPARATOR;
  }

  private static numbers(row: UsageRow): string[] {
    return [
      `${CompactNumberFormatter.format(row.inputTokens)} (${CompactNumberFormatter.format(row.cachedInputTokens)})`,
      CompactNumberFormatter.format(row.outputTokens),
      CompactNumberFormatter.format(row.totalTokens),
      MoneyFormatter.usd(row.costUsd),
      String(row.calls),
      DurationFormatter.format(row.durationMs),
    ];
  }

  private static totalNumbers(totals: UsageTotals): string[] {
    return UsageFormatter.numbers({
      label: TOTAL_LABEL,
      model: '',
      calls: totals.calls,
      inputTokens: totals.inputTokens,
      cachedInputTokens: totals.cachedInputTokens,
      outputTokens: totals.outputTokens,
      totalTokens: totals.totalTokens,
      costUsd: totals.costUsd,
      durationMs: totals.durationMs,
    });
  }
}
