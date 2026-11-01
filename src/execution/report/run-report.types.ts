import type { DeferredIssue } from '../../agents/orchestrator/decide/step-decision.types';
import type { RunSummary } from '../../agents/orchestrator/summarize/run-summary.types';
import type { QaStatus } from '../../agents/qa/qa-status.enum';
import type { ReviewVerdict } from '../../agents/reviewer/review-verdict.enum';
import type { RunStatus } from '../run-status.enum';
import type { StepStatus } from '../step-status.enum';

export interface RunReportStep {
  readonly index: number;
  readonly title: string;
  readonly status: StepStatus;
  readonly attempts: number;
  readonly summary: string;
  readonly commitSha: string | null;
  readonly failureReason: string | null;
  readonly note: string | null;
  readonly qaStatus: QaStatus | null;
  readonly reviewVerdict: ReviewVerdict | null;
  readonly overrideReasons: readonly string[];
  readonly tokens: number;
}

export interface RunReportAgentMetrics {
  readonly agent: string;
  readonly calls: number;
  readonly tokens: number;
  readonly toolCalls: number;
  readonly commandRuns: number;
}

export interface RunReportStepMetrics {
  readonly index: number;
  readonly tokens: number;
  readonly toolCalls: number;
  readonly commandRuns: number;
}

export interface RunReportMetrics {
  readonly tokensTotal: number;
  readonly tokenBudget: number;
  readonly agentCalls: number;
  readonly toolCalls: number;
  readonly commandRuns: number;
  readonly byAgent: readonly RunReportAgentMetrics[];
  readonly byStep: readonly RunReportStepMetrics[];
}

// Everything the final report says. Every number in it comes from the agent call ledger, the
// recorders and git, never from what an agent wrote.
export interface RunReport {
  readonly runId: string;
  readonly shortId: string;
  readonly prompt: string;
  readonly branch: string | null;
  readonly status: RunStatus;
  readonly durationMs: number;
  readonly planSummary: string;
  readonly assumptions: readonly string[];
  readonly questions: readonly string[];
  readonly steps: readonly RunReportStep[];
  readonly deferredIssues: readonly DeferredIssue[];
  readonly stoppedReason: string | null;
  readonly summary: RunSummary | null;
  readonly metrics: RunReportMetrics;
}
