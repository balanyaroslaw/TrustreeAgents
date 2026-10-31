import {
  JEST_FAILED_PATTERN,
  JEST_PASSED_PATTERN,
  JEST_SKIPPED_PATTERN,
  JEST_SUMMARY_LINE_PATTERN,
  JEST_TOTAL_PATTERN,
} from './test-command.constants';
import type { TestSummaryCounts } from './test-summary.types';

const COUNT_GROUP_INDEX = 1;
const SUMMARY_GROUP_INDEX = 1;

export class TestSummaryParser {
  static parse(output: string): TestSummaryCounts {
    const summary = TestSummaryParser.lastSummaryLine(output);
    if (summary === null) {
      return {};
    }

    return {
      ...TestSummaryParser.count('total', summary, JEST_TOTAL_PATTERN),
      ...TestSummaryParser.count('passed', summary, JEST_PASSED_PATTERN),
      ...TestSummaryParser.count('failed', summary, JEST_FAILED_PATTERN),
      ...TestSummaryParser.count('skipped', summary, JEST_SKIPPED_PATTERN),
    };
  }

  private static lastSummaryLine(output: string): string | null {
    const pattern = new RegExp(JEST_SUMMARY_LINE_PATTERN);
    let summary: string | null = null;
    for (;;) {
      const match = pattern.exec(output);
      if (match === null) {
        return summary;
      }
      summary = match[SUMMARY_GROUP_INDEX];
    }
  }

  private static count(
    key: keyof TestSummaryCounts,
    summary: string,
    pattern: RegExp,
  ): TestSummaryCounts {
    const match = pattern.exec(summary);
    return match === null ? {} : { [key]: Number.parseInt(match[COUNT_GROUP_INDEX], 10) };
  }
}
