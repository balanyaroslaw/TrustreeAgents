import type { AgentCallRecord } from '../execution.types';
import type { AttemptRecord } from './persistence.types';

// Attempts and the per-call token usage. The agent calls carry their step and attempt, so the
// usage of a run can be broken down per step.
export interface AttemptRepository {
  appendAttempt(attempt: AttemptRecord): Promise<void>;
  appendAgentCall(call: AgentCallRecord): Promise<void>;
  attemptsOf(runId: string, stepIndex: number): Promise<readonly AttemptRecord[]>;
}
