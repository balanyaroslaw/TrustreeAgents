import { ActivityClock } from './activity-clock';
import { ChangeAction } from './change-action.enum';
import type { TrackedChange } from './tracked-change.types';

export class ChangeTracker {
  private readonly changes = new Map<string, TrackedChange>();

  constructor(private readonly clock: ActivityClock) {}

  record(path: string, action: ChangeAction): void {
    const current = this.changes.get(path);
    const merged = ChangeTracker.merge(current?.action, action);
    const sequence = this.clock.next();

    if (merged === null) {
      this.changes.delete(path);
      return;
    }
    this.changes.set(path, { path, action: merged, sequence });
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
