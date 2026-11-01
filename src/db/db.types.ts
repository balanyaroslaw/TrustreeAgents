// The result of a database write that must never lose agent work: the value when it succeeded,
// and a warning the caller surfaces in the run report when it did not.
export interface GuardedWrite<TValue> {
  readonly value: TValue | null;
  readonly warning: string | null;
}

// Whether the pending migrations could be applied, with the output of the Prisma CLI for the
// message shown when they could not.
export interface MigrationResult {
  readonly applied: boolean;
  readonly output: string;
}
