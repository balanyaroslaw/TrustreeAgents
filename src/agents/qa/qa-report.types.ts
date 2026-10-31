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

export interface QaReport {
  readonly result: QaResult;
  readonly status: QaStatus;
  readonly statusReasons: readonly string[];
  readonly scope: QaScope;
  readonly lastFullRun: QaFullRun | null;
  readonly metrics: QaMetrics;
  readonly warnings: readonly string[];
}
