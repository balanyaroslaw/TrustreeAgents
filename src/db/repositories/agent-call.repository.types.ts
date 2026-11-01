import type { AgentRole } from '../../agents/agent-role.enum';
import type { StepStatus } from '../../execution/step-status.enum';

export interface NewAgentCall {
  readonly runId: string;
  readonly attemptId?: string | null;
  readonly role: AgentRole;
  readonly task?: string | null;
  readonly model: string;
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
  readonly toolCalls: number;
  readonly durationMs: number;
  readonly failureKind?: string | null;
  // sha256 of the rendered instructions, to spot prompt drift between runs.
  readonly instructionsHash?: string | null;
  readonly startedAt?: Date;
  readonly finishedAt?: Date | null;
}

export interface RecordedAgentCall {
  readonly id: string | null;
  readonly costUsd: number;
  readonly warning: string | null;
}

export interface UsageRow {
  readonly label: string;
  readonly model: string;
  readonly calls: number;
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly costUsd: number;
  readonly durationMs: number;
}

export interface StepUsageRow extends UsageRow {
  readonly index: number | null;
  readonly status: StepStatus | null;
  readonly attempts: number;
}

export interface UsageTotals {
  readonly calls: number;
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly costUsd: number;
  readonly durationMs: number;
  readonly models: readonly string[];
}

export interface UsageFilter {
  readonly runId?: string;
}
