import type { AgentRunUsage } from '../../agents/developer/developer-report.types';
import type { TrackedChange } from '../../workspace/activity/tracked-change.types';
import type { RepeatedToolCall } from '../../workspace/activity/tool-call.types';
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
  // The calls this one made repeatedly with the same arguments, counted by the recorder that
  // counts the calls themselves.
  readonly repeatedCalls: readonly RepeatedToolCall[];
}

// What a failed call still reports, so nothing is lost from the accounting.
export interface PartialInvocation {
  readonly usage: AgentUsage;
  readonly changes: readonly TrackedChange[];
  readonly commandRuns: readonly CommandRunRecord[];
  // What the call had done when it was stopped. A call that ran out of turns is exactly the one
  // whose tool calls have to be reported, so they are carried here rather than counted as none.
  readonly toolCalls: number;
  readonly repeatedCalls: readonly RepeatedToolCall[];
}

// Where a call belongs in the run: the step and attempt it was made for, and the id of the
// attempt row it is charged to. All three are null for the Orchestrator calls that sit outside
// any step.
export interface AgentCallScope {
  readonly stepIndex: number | null;
  readonly attempt: number | null;
  readonly attemptId: string | null;
}
