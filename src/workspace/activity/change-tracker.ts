import { ActivityClock } from './activity-clock';
import { ChangeAction } from './change-action.enum';
import type { TrackedChange } from './tracked-change.types';

const NO_SEQUENCE = 0;

export class ChangeTracker {
  private readonly changes = new Map<string, TrackedChange>();
  // When the last change happened on the shared timeline, kept apart from the map so that a file
  // created and then deleted still counts as a change: a reader asking whether anything changed
  // since a command ran must not be told "nothing" because the change cancelled itself out.
  private lastSequence = NO_SEQUENCE;

  constructor(private readonly clock: ActivityClock) {}

  record(path: string, action: ChangeAction): void {
    const current = this.changes.get(path);
    const merged = ChangeTracker.merge(current?.action, action);
    const sequence = this.clock.next();
    this.lastSequence = sequence;

    if (merged === null) {
      this.changes.delete(path);
      return;
    }
    this.changes.set(path, { path, action: merged, sequence });
  }

  // Whether any file changed after the given point on the shared timeline.
  changedSince(sequence: number): boolean {
    return this.lastSequence > sequence;
  }

  snapshot(): TrackedChange[] {
    return [...this.changes.values()].sort((left, right) => left.sequence - right.sequence);
  }

  private static merge(
    current: ChangeAction | undefined,
    action: ChangeAction,
  ): ChangeAction | null {
    if (current === undefined) {
      return action;
    }
    if (action === ChangeAction.Deleted) {
      return current === ChangeAction.Created ? null : ChangeAction.Deleted;
    }
    if (current === ChangeAction.Created) {
      return ChangeAction.Created;
    }
    return ChangeAction.Modified;
  }
}
