import {
  ARGUMENT_SEPARATOR,
  FLAG_PREFIX,
  NPM_EXECUTABLE,
  NPM_RUN_SUBCOMMAND,
  NPM_TEST_SCRIPT_PATTERN,
  NPM_TEST_SUBCOMMAND,
  NPX_EXECUTABLE,
  TEST_FILTER_FLAGS,
  TEST_RUNNERS,
} from './test-command.constants';
import { TestRunKind } from './test-run-kind.enum';

const WHITESPACE_PATTERN = /\s+/;
const EXECUTABLE_INDEX = 0;
const FIRST_ARGUMENT_INDEX = 1;
const SECOND_ARGUMENT_INDEX = 2;
const FLAG_VALUE_SEPARATOR = '=';

// Best effort: the command is classified from its text only, so an unusual npm script name or a
// runner wrapped in another command is reported as NotTest rather than guessed.
export class TestRunClassifier {
  static classify(command: string): TestRunKind {
    const tokens = command.trim().split(WHITESPACE_PATTERN).filter(TestRunClassifier.isPresent);
    const testArguments = TestRunClassifier.testArguments(tokens);

    if (testArguments === null) {
      return TestRunKind.NotTest;
    }
    return TestRunClassifier.isNarrowed(testArguments)
      ? TestRunKind.Partial
      : TestRunKind.FullSuite;
  }

  private static testArguments(tokens: readonly string[]): readonly string[] | null {
    const executable = tokens[EXECUTABLE_INDEX];
    if (executable === undefined) {
      return null;
    }
    if (TEST_RUNNERS.includes(executable)) {
      return tokens.slice(FIRST_ARGUMENT_INDEX);
    }
    if (executable === NPX_EXECUTABLE) {
      return TEST_RUNNERS.includes(tokens[FIRST_ARGUMENT_INDEX] ?? '')
        ? tokens.slice(SECOND_ARGUMENT_INDEX)
        : null;
    }
    return executable === NPM_EXECUTABLE ? TestRunClassifier.npmTestArguments(tokens) : null;
  }

  private static npmTestArguments(tokens: readonly string[]): readonly string[] | null {
    const subcommand = tokens[FIRST_ARGUMENT_INDEX];
    if (subcommand === NPM_TEST_SUBCOMMAND) {
      return tokens.slice(SECOND_ARGUMENT_INDEX);
    }
    if (subcommand !== NPM_RUN_SUBCOMMAND) {
      return null;
    }
    const script = tokens[SECOND_ARGUMENT_INDEX] ?? '';
    return NPM_TEST_SCRIPT_PATTERN.test(script)
      ? tokens.slice(SECOND_ARGUMENT_INDEX + FIRST_ARGUMENT_INDEX)
      : null;
  }

  private static isNarrowed(testArguments: readonly string[]): boolean {
    return testArguments
      .filter((argument) => argument !== ARGUMENT_SEPARATOR)
      .some(TestRunClassifier.narrowsTheRun);
  }

  private static narrowsTheRun(argument: string): boolean {
    if (!argument.startsWith(FLAG_PREFIX)) {
      return true;
    }
    const flag = argument.split(FLAG_VALUE_SEPARATOR)[EXECUTABLE_INDEX];
    return TEST_FILTER_FLAGS.includes(flag);
  }

  private static isPresent(token: string): boolean {
    return token !== '';
  }
}
