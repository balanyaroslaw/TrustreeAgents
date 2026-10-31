import { ActivityClock } from '../activity/activity-clock';
import { MAX_OUTPUT_TAIL_CHARACTERS } from './test-command.constants';
import type { CommandRunInput, CommandRunRecord } from './command-run.types';

export class CommandRunRecorder {
  private readonly runs: CommandRunRecord[] = [];

  constructor(private readonly clock: ActivityClock) {}

  record(input: CommandRunInput): CommandRunRecord {
    const run: CommandRunRecord = {
      ...input,
      outputTail: CommandRunRecorder.tailOf(input.outputTail),
      sequence: this.clock.next(),
    };
    this.runs.push(run);
    return run;
  }

  snapshot(): readonly CommandRunRecord[] {
    return [...this.runs];
  }

  private static tailOf(output: string): string {
    return output.length <= MAX_OUTPUT_TAIL_CHARACTERS
      ? output
      : output.slice(output.length - MAX_OUTPUT_TAIL_CHARACTERS);
  }
}
