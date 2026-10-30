import { ChangeAction } from './change-action.enum';
import type { TrackedChange } from './developer-report.types';

export class ChangeTracker {
  private readonly changes = new Map<string, ChangeAction>();

  record(path: string, action: ChangeAction): void {
    const merged = ChangeTracker.merge(this.changes.get(path), action);
    if (merged === null) {
      this.changes.delete(path);
      return;
    }
    this.changes.set(path, merged);
  }

  snapshot(): TrackedChange[] {
    return [...this.changes.entries()].map(([path, action]) => ({ path, action }));
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
