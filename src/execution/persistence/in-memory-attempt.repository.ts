import { Injectable } from '@nestjs/common';
import type { AgentCallRecord } from '../execution.types';
import type { AttemptRepository } from './attempt-repository.port.types';
import type { AttemptRecord } from './persistence.types';

@Injectable()
export class InMemoryAttemptRepository implements AttemptRepository {
  private readonly attempts: AttemptRecord[] = [];
  private readonly calls: AgentCallRecord[] = [];

  async appendAttempt(attempt: AttemptRecord): Promise<void> {
    this.attempts.push(attempt);
  }

  async appendAgentCall(call: AgentCallRecord): Promise<void> {
    this.calls.push(call);
  }

  async attemptsOf(runId: string, stepIndex: number): Promise<readonly AttemptRecord[]> {
    return this.attempts.filter(
      (attempt) => attempt.runId === runId && attempt.stepIndex === stepIndex,
    );
  }

  agentCallsOf(runId: string): readonly AgentCallRecord[] {
    return this.calls.filter((call) => call.runId === runId);
  }
}
