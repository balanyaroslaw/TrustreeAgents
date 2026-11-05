import { TestSummaryParser } from '../test-summary.parser';
import {
  ERROR_LINE_PATTERN,
  MAX_SAMPLE_LINES,
  STACK_LINE_PATTERN,
} from './failure-diagnosis.constants';
import type { ParsedFailure, ParsedFailures } from './test-failure.types';

const LINE_SEPARATOR = '\n';
const NEXT_LINE = 1;

// The fallback for every runner whose failing-test format is not recognised: each line that opens
// with an error class is one failure, with the stack lines that follow it. No test names are
// invented, and the counts are the ones the runner printed or none at all.
export class GenericFailureParser {
  static parse(output: string): ParsedFailures {
    const lines = output.split(LINE_SEPARATOR);
    const failures: ParsedFailure[] = [];
    const counts = TestSummaryParser.parse(output);

    for (const [index, line] of lines.entries()) {
      if (ERROR_LINE_PATTERN.test(line)) {
        failures.push({
          test: null,
          errorLine: line.trim(),
          stack: GenericFailureParser.stackAt(lines, index + NEXT_LINE),
        });
      }
    }

    return {
      failures,
      failedCount: counts.failed ?? null,
      totalCount: counts.total ?? null,
    };
  }

  private static stackAt(lines: readonly string[], from: number): string[] {
    const stack: string[] = [];

    for (let index = from; index < lines.length; index += NEXT_LINE) {
      if (!STACK_LINE_PATTERN.test(lines[index]) || stack.length >= MAX_SAMPLE_LINES) {
        break;
      }
      stack.push(lines[index].trimEnd());
    }

    return stack;
  }
}
