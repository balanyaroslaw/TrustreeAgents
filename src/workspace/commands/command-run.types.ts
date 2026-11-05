import type { TestRunKind } from './test-run-kind.enum';
import type { TestFailureReport } from './failures/test-failure.types';

export interface CommandRunInput {
  readonly command: string;
  readonly cwd: string;
  readonly exitCode: number | null;
  readonly timedOut: boolean;
  readonly durationMs: number;
  readonly outputTail: string;
  // Whether this command ran the project's tests, and what its failures were caused by. Both are
  // computed by code from the command text and its output while the run is recorded, so every
  // reader of a recorded run sees the same analysis.
  readonly testRunKind: TestRunKind;
  readonly failureReport: TestFailureReport | null;
}

export interface CommandRunRecord extends CommandRunInput {
  readonly sequence: number;
}

// What code put above the raw output of one command before the model saw it: the computed
// failure summary, and the note that an identical run had already been made.
export interface CommandRunAnnotation {
  readonly notes: readonly string[];
  readonly testRunKind: TestRunKind;
  readonly failureReport: TestFailureReport | null;
}
