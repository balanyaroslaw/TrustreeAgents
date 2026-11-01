import type { ActivityClock } from './activity-clock';
import type { ChangeTracker } from './change-tracker';
import type { CommandRunRecorder } from '../commands/command-run.recorder';
import type { FileAccessRecorder } from './file-access.recorder';

// The recorders of one agent call. They share one clock, so a report can tell whether a command
// ran before or after a file changed.
export interface CallRecorders {
  readonly clock: ActivityClock;
  readonly changes: ChangeTracker;
  readonly commands: CommandRunRecorder;
  readonly files: FileAccessRecorder;
}
