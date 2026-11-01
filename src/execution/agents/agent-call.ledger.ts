import { AgentRole } from '../../agents/agent-role.enum';
import type { AgentCallRecord } from '../execution.types';

const NO_TOKENS = 0;

// Every agent call of one run, in order, with what it spent. The final report is built from this
// ledger and the recorders, never from what an agent says it did.
export class AgentCallLedger {
  private readonly calls: AgentCallRecord[] = [];

  record(call: AgentCallRecord): void {
    this.calls.push(call);
  }

  all(): readonly AgentCallRecord[] {
    return [...this.calls];
  }

  ofRole(role: AgentRole): readonly AgentCallRecord[] {
    return this.calls.filter((call) => call.role === role);
  }

  ofStep(stepIndex: number): readonly AgentCallRecord[] {
    return this.calls.filter((call) => call.stepIndex === stepIndex);
  }

  tokensTotal(): number {
    return this.calls.reduce((total, call) => total + call.tokens.total, NO_TOKENS);
  }

  toolCalls(): number {
    return this.calls.reduce((total, call) => total + call.toolCalls, NO_TOKENS);
  }

  commandRuns(): number {
    return this.calls.reduce((total, call) => total + call.commandRuns, NO_TOKENS);
  }
}
