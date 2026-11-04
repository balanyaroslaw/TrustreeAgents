import type { CommandRunRecord } from '../../../workspace/commands/command-run.types';
import type { QaDefect } from '../../qa/qa-result.types';
import type { ReviewIssue } from '../../reviewer/review-result.types';
import type { PreviousAttemptDecision } from './decision-input.types';
import type { DeferredIssue } from './step-decision.types';

// The failing full-suite run of the previous attempt: the Developer never saw this output, only
// the defect text QA derived from it.
export interface FailingRunOutput {
  readonly command: string;
  readonly outputTail: string;
}

// A line range of one file, planned before anything is read from disk.
export interface ExcerptRange {
  readonly path: string;
  readonly startLine: number;
  readonly endLine: number;
}

// The lines a range covers, read from disk by code.
export interface CodeExcerpt extends ExcerptRange {
  readonly code: string;
}

export interface PreviousAttemptNote {
  readonly attempt: number;
  readonly focus: string;
  readonly reason: string;
}

// What the budget left out, so the rendered brief can say so instead of silently shrinking.
export interface ReworkBriefOmissions {
  readonly attempts: number;
  readonly excerpts: number;
  readonly failingOutputTrimmed: boolean;
  // Set when not even a shortened tail fit, so the brief says the output is missing instead of
  // leaving the Developer to assume there was none.
  readonly failingOutputDropped: boolean;
}

// Gathered by code before the brief is assembled. Null and empty mean there was no data, which
// the assembled brief omits entirely rather than rendering as a heading with nothing under it.
export interface ReworkBriefFacts {
  readonly failingOutput: FailingRunOutput | null;
  readonly referencedCode: readonly CodeExcerpt[];
  readonly diffStat: string | null;
  readonly previousAttempts: readonly PreviousAttemptNote[];
}

// The front-loaded parts of the brief, each absent when it has no data. referencedCode is ordered
// by issue severity, so dropping from its end drops the least severe excerpt first.
export interface ReworkBriefExtras {
  readonly failingOutput?: FailingRunOutput;
  readonly referencedCode?: readonly CodeExcerpt[];
  readonly diffStat?: string;
  readonly previousAttempts?: readonly PreviousAttemptNote[];
  readonly omissions?: ReworkBriefOmissions;
}

export interface ReworkBrief extends ReworkBriefExtras {
  readonly focus: readonly string[];
  readonly qaDefects: readonly QaDefect[];
  readonly reviewIssues: readonly ReviewIssue[];
  readonly deferredIssues: readonly DeferredIssue[];
}

// Planning state while excerpt ranges are decided: the issue lines collected for one file and the
// rank of the most severe issue among them.
export interface ExcerptGroup {
  readonly path: string;
  readonly lines: number[];
  severityRank: number;
}

// Everything the collector needs to gather the front-loaded facts. The caller already has all of
// it: the Developer is never asked for any of it.
export interface ReworkBriefFactsRequest {
  readonly baseRef: string;
  readonly blockingIssues: readonly ReviewIssue[];
  readonly commandRuns: readonly CommandRunRecord[];
  readonly testScript: string | null;
  // The command the QA report resolved as the full suite, so the brief quotes the run the report
  // judged the step by. Null when it resolved none, which falls back to classifying the command.
  readonly fullSuiteCommand: string | null;
  readonly previousDecisions: readonly PreviousAttemptDecision[];
}

// Working state while the budget decides what fits. Mutable on purpose: the budget shrinks it
// step by step and then assembles the immutable extras from what is left.
export interface ReworkBriefDraft {
  readonly diffStat: string | null;
  failingOutput: FailingRunOutput | null;
  referencedCode: CodeExcerpt[];
  previousAttempts: PreviousAttemptNote[];
  droppedAttempts: number;
  droppedExcerpts: number;
  failingOutputTrimmed: boolean;
  failingOutputDropped: boolean;
}
