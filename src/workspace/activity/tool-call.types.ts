// One tool call made with the same name and the same arguments more than once inside one agent
// call. Counted by code, so a loop is reported as a loop and not as work.
export interface RepeatedToolCall {
  readonly tool: string;
  readonly arguments: string;
  readonly count: number;
}

// Counting state for one distinct call: mutable on purpose, the count grows as the call repeats.
export interface ToolCallTally {
  readonly tool: string;
  readonly arguments: string;
  count: number;
}
