import { ActivityClock } from './activity-clock';

// One instance per agent call: records which workspace files the agent actually opened, so a
// report can tell apart a file that was reviewed from one that was only listed.
export class FileAccessRecorder {
  private readonly accessed = new Map<string, number>();

  constructor(private readonly clock: ActivityClock) {}

  record(path: string): void {
    if (!this.accessed.has(path)) {
      this.accessed.set(path, this.clock.next());
    }
  }

  paths(): readonly string[] {
    return [...this.accessed.keys()];
  }
}
