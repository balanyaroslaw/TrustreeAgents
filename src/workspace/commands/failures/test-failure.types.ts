import type { FailureClass } from './failure-class.enum';

// One cause, with the failures that share it. The signature is the first error line with its
// volatile parts removed, so two failures of the same cause land in one group.
export interface TestFailureGroup {
  readonly signature: string;
  readonly count: number;
  readonly failureClass: FailureClass;
  readonly sampleTests: readonly string[];
  readonly sampleStack: string;
}

// What one test-run command left behind, computed from its output by code. An output that cannot
// be parsed has no groups: nothing here guesses a cause.
export interface TestFailureReport {
  readonly failedCount: number;
  readonly totalCount: number | null;
  readonly groups: readonly TestFailureGroup[];
  // Set when the output names a problem on the host that no agent can fix by editing the
  // workspace, for example a port another container holds.
  readonly hostBlocking: boolean;
  // The one thing a person has to do about that host problem, copied from the pattern list that
  // recognised it. Null whenever hostBlocking is false.
  readonly hostBlockingAdvice: string | null;
}

// One failure as the output was parsed into: the test it belongs to when the runner names one,
// its first error line verbatim and the first lines of its stack.
export interface ParsedFailure {
  readonly test: string | null;
  readonly errorLine: string;
  readonly stack: readonly string[];
}

// What a parser read out of one output. The counts are null when the runner printed none; they
// are never computed from the number of failures the parser happened to recognise.
export interface ParsedFailures {
  readonly failures: readonly ParsedFailure[];
  readonly failedCount: number | null;
  readonly totalCount: number | null;
}

// A pattern that recognises a kind of failure, with the one line a person can act on. The advice
// is a constant, never written by a model.
export interface FailureRule {
  readonly pattern: RegExp;
  readonly advice: string;
}

// One volatile part of an error line and what replaces it while a signature is built.
export interface NormalisationRule {
  readonly pattern: RegExp;
  readonly replacement: string;
}

// Grouping state while the failures of one output are collected. Mutable on purpose: the group
// grows as failures of the same signature are met, and the immutable group is built at the end.
export interface FailureGroupDraft {
  readonly signature: string;
  readonly failureClass: FailureClass;
  readonly tests: string[];
  count: number;
  sampleStack: string;
}
