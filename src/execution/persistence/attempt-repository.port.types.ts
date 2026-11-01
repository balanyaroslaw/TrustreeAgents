import type { AttemptCompletion, NewAttempt } from './persistence.types';

// The attempts of a step. An attempt is opened before its agents run so the agent calls it pays
// for can be written with its id, and completed afterwards with the reports and the decision.
// The PostgreSQL implementation is AttemptRepository in src/db/repositories.
export interface AttemptRepository {
  openAttempt(attempt: NewAttempt): Promise<string | null>;
  completeAttempt(completion: AttemptCompletion): Promise<void>;
}
