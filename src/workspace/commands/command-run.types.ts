export interface CommandRunInput {
  readonly command: string;
  readonly cwd: string;
  readonly exitCode: number | null;
  readonly timedOut: boolean;
  readonly durationMs: number;
  readonly outputTail: string;
}

export interface CommandRunRecord extends CommandRunInput {
  readonly sequence: number;
}
