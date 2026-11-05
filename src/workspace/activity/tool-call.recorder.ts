import {
  MAX_REPEATED_CALLS_REPORTED,
  REPEATED_CALL_THRESHOLD,
} from '../commands/failures/failure-diagnosis.constants';
import { ToolArgumentSignature } from './tool-argument.signature';
import type { RepeatedToolCall, ToolCallTally } from './tool-call.types';

const NO_CALLS = 0;
const ONE_CALL = 1;
const START = 0;

// How many tool calls one agent call made, and which of them it made over and over with the same
// arguments. The total is what the report and the accounting have always used; the repetitions
// are what tells a run that spent its turns in a loop apart from one that spent them working.
export class ToolCallRecorder {
  private readonly tallies = new Map<string, ToolCallTally>();
  private calls = NO_CALLS;

  record(tool: string, input: unknown): void {
    this.calls += ONE_CALL;
    const args = ToolArgumentSignature.of(input);
    const key = `${tool} ${args}`;
    const known = this.tallies.get(key);
    if (known === undefined) {
      this.tallies.set(key, { tool, arguments: args, count: ONE_CALL });
      return;
    }
    known.count += ONE_CALL;
  }

  get count(): number {
    return this.calls;
  }

  // Most repeated first, so the first line of a diagnosis is the loop that cost the most turns.
  repeated(): RepeatedToolCall[] {
    return [...this.tallies.values()]
      .filter((tally) => tally.count >= REPEATED_CALL_THRESHOLD)
      .sort((left, right) => right.count - left.count)
      .slice(START, MAX_REPEATED_CALLS_REPORTED)
      .map((tally) => ({ tool: tally.tool, arguments: tally.arguments, count: tally.count }));
  }
}
