import type { ChangeAction } from './change-action.enum';

// One file the agent changed during its call, in the order the change happened.
export interface TrackedChange {
  readonly path: string;
  readonly action: ChangeAction;
  readonly sequence: number;
}
