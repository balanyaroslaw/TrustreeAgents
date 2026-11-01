import type { AgentRunUsage } from '../../agents/developer/developer-report.types';
import type { TrackedChange } from '../../workspace/activity/tracked-change.types';
import type { CommandRunRecord } from '../../workspace/commands/command-run.types';

export interface AgentUsage extends AgentRunUsage {
  readonly total: number;
}

// What one agent call returns: its structured output plus the facts the recorders collected
// during the call. Every number the executor reports comes from here, never from agent prose.
export interface AgentInvocation<TOutput> {
  readonly output: TOutput;
  readonly usage: AgentUsage;
  readonly toolCalls: number;
  readonly durationMs: number;
  readonly changes: readonly TrackedChange[];
  readonly commandRuns: readonly CommandRunRecord[];
  readonly readPaths: readonly string[];
}

// What a failed call still reports, so nothing is lost from the accounting.
export interface PartialInvocation {
  readonly usage: AgentUsage;
  readonly changes: readonly TrackedChange[];
  readonly commandRuns: readonly CommandRunRecord[];
}

export interface AgentCallScope {
  readonly stepIndex: number | null;
  readonly attempt: number | null;
}
