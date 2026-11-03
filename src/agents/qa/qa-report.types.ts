import type { TestSummaryCounts } from '../../workspace/commands/test-summary.types';
import type { TokenMetrics } from '../developer/developer-report.types';
import type { QaResult } from './qa-result.types';
import type { QaStatus } from './qa-status.enum';

export interface QaScope {
  readonly sourceFiles: number;
  readonly testFiles: number;
  readonly otherFiles: number;
}

export interface QaFullRun {
  readonly command: string;
  readonly exitCode: number | null;
  readonly timedOut: boolean;
  readonly durationMs: number;
  readonly fresh: boolean;
  readonly summary: TestSummaryCounts;
}

export interface QaMetrics {
  readonly testFilesChanged: number;
  readonly commandsRun: number;
  readonly tokens: TokenMetrics;
  readonly toolCalls: number;
  readonly durationMs: number;
}

// How the full-suite run was resolved: the run itself, or the command QA named and never ran. One
// of the two is always null.
export interface ResolvedFullRun {
  readonly run: QaFullRun | null;
  readonly namedButNotRun: string | null;
}

// A criterion QA could not cover with an automated test, with the reason it gave for that. It is
// reported rather than held against the step: the Orchestrator and the Reviewer weigh the reason
// themselves, which no amount of Developer work could do for them.
export interface QaUncoverableCriterion {
  readonly criterion: string;
  readonly reason: string;
}

export interface QaReport {
  readonly result: QaResult;
  readonly status: QaStatus;
  readonly statusReasons: readonly string[];
  readonly uncoverableCriteria: readonly QaUncoverableCriterion[];
  readonly scope: QaScope;
  readonly lastFullRun: QaFullRun | null;
  readonly metrics: QaMetrics;
  readonly warnings: readonly string[];
}
