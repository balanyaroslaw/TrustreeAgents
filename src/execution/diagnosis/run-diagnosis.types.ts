import type { RepeatedToolCall } from '../../workspace/activity/tool-call.types';
import type { TestFailureGroup } from '../../workspace/commands/failures/test-failure.types';
import type { RunFailureKind } from './run-failure-kind.enum';

// One repetition, with the agent that made it: the same tool call three times in one call of the
// Developer is a different fact from the same call once in each of three attempts.
export interface AgentRepeatedCall extends RepeatedToolCall {
  readonly agent: string;
}

// Why one step was not accepted, in the terms a person can act on. Every part of it is read from
// what the run recorded: the ledger of agent calls, the analysed output of the test runs and the
// pattern lists. Nothing here is asked of a model.
export interface RunDiagnosisStep {
  readonly index: number;
  readonly title: string;
  readonly kind: RunFailureKind;
  readonly failure: string;
  // What the last failing full-suite run of the step reported, and the causes its failures were
  // grouped into, largest first.
  readonly failedCount: number;
  readonly totalCount: number | null;
  readonly groups: readonly TestFailureGroup[];
  readonly repeatedCalls: readonly AgentRepeatedCall[];
  // The one thing to do about the cause, taken from the pattern lists. Null when the cause is
  // not one the lists cover.
  readonly whatToDo: string | null;
}

export interface RunDiagnosis {
  readonly steps: readonly RunDiagnosisStep[];
}

// Working state while the rendered diagnosis is cut to its budget: the groups shrink, so they
// are mutable here and immutable everywhere else.
export interface RunDiagnosisStepDraft {
  readonly step: RunDiagnosisStep;
  groups: TestFailureGroup[];
}
