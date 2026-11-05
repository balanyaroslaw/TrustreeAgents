import {
  ERROR_LINE_PATTERN,
  MAX_SAMPLE_LINES,
  NODE_ENTRY_END_PATTERN,
  NODE_FAILING_TESTS_HEADER,
  NODE_FAILURE_LINE_PATTERN,
  NODE_FAIL_COUNT_PATTERN,
  NODE_TESTS_COUNT_PATTERN,
  TEST_DURATION_SUFFIX_PATTERN,
} from './failure-diagnosis.constants';
import type { ParsedFailure, ParsedFailures } from './test-failure.types';

const LINE_SEPARATOR = '\n';
const NAME_GROUP = 1;
const COUNT_GROUP = 1;
const NEXT_LINE = 1;
const DECIMAL = 10;

// Reads the output of `node --test`, in its spec reporter and in TAP: the failing test lines and
// the block that repeats them at the end, plus the counters the runner prints for the whole run.
//
// node --test prints every failure twice, once while the suite runs and once in the "failing
// tests:" block, so failures are kept per test name: the counts come from the runner's own
// counters and never from how many lines this parser happened to recognise.
export class NodeTestParser {
  static parse(output: string): ParsedFailures {
    const lines = output.split(LINE_SEPARATOR);
    const byTest = new Map<string, ParsedFailure>();
    let failedCount: number | null = null;
    let totalCount: number | null = null;

    for (const [index, line] of lines.entries()) {
      failedCount = NodeTestParser.countOf(line, NODE_FAIL_COUNT_PATTERN) ?? failedCount;
      totalCount = NodeTestParser.countOf(line, NODE_TESTS_COUNT_PATTERN) ?? totalCount;

      const name = NodeTestParser.failedTestName(line);
      if (name === null || byTest.has(name)) {
        continue;
      }
      const failure = NodeTestParser.failureAt(name, lines, index + NEXT_LINE);
      if (failure !== null) {
        byTest.set(name, failure);
      }
    }

    return { failures: [...byTest.values()], failedCount, totalCount };
  }

  private static failedTestName(line: string): string | null {
    const match = NODE_FAILURE_LINE_PATTERN.exec(line);
    if (match === null) {
      return null;
    }
    const name = match[NAME_GROUP].replace(TEST_DURATION_SUFFIX_PATTERN, '').trim();

    return name === '' || name === NODE_FAILING_TESTS_HEADER ? null : name;
  }

  // The lines under one failing test, up to the next entry of the reporter: the first line that
  // names an error class is the cause, the lines after it are its stack.
  private static failureAt(
    test: string,
    lines: readonly string[],
    from: number,
  ): ParsedFailure | null {
    let errorLine: string | null = null;
    const stack: string[] = [];

    for (let index = from; index < lines.length; index += NEXT_LINE) {
      const line = lines[index];
      if (NODE_ENTRY_END_PATTERN.test(line)) {
        break;
      }
      if (errorLine === null) {
        if (ERROR_LINE_PATTERN.test(line)) {
          errorLine = line.trim();
        }
        continue;
      }
      if (line.trim() !== '' && stack.length < MAX_SAMPLE_LINES) {
        stack.push(line.trimEnd());
      }
    }

    return errorLine === null ? null : { test, errorLine, stack };
  }

  private static countOf(line: string, pattern: RegExp): number | null {
    const match = pattern.exec(line);

    return match === null ? null : Number.parseInt(match[COUNT_GROUP], DECIMAL);
  }
}
