import type { AgentRole } from '../agents/agent-role.enum';
import type { OrchestratorTask } from '../agents/orchestrator/orchestrator-task.enum';
import { ActivityClock } from '../workspace/activity/activity-clock';
import { ChangeTracker } from '../workspace/activity/change-tracker';
import { FileAccessRecorder } from '../workspace/activity/file-access.recorder';
import type { CallRecorders } from '../workspace/activity/call-recorders.types';
import type { TrackedChange } from '../workspace/activity/tracked-change.types';
import { CommandRunRecorder } from '../workspace/commands/command-run.recorder';
import type { CommandRunRecord } from '../workspace/commands/command-run.types';

const NO_CALLS = 0;

// One instance per agent call, holding that call's recorders and its tool-call counter. Nothing
// here is shared: two calls running at the same time have two contexts.
export class AgentCallContext {
  readonly recorders: CallRecorders;
  private calls = NO_CALLS;

  constructor(
    readonly role: AgentRole,
    readonly task: OrchestratorTask | null,
  ) {
    const clock = new ActivityClock();
    this.recorders = {
      clock,
      changes: new ChangeTracker(clock),
      commands: new CommandRunRecorder(clock),
      files: new FileAccessRecorder(clock),
    };
  }

  countToolCall(): void {
    this.calls += 1;
  }

  get toolCalls(): number {
    return this.calls;
  }

  changes(): readonly TrackedChange[] {
    return this.recorders.changes.snapshot();
  }

  commandRuns(): readonly CommandRunRecord[] {
    return this.recorders.commands.snapshot();
  }

  readPaths(): readonly string[] {
    return this.recorders.files.paths();
  }
}
