import type { AgentUsage } from '../execution/agents/agent-invocation.types';

const NO_TOKENS = 0;

// Adds up the usage of every attempt of one call, so a retried call reports what it really cost
// and a failed call still reports what it spent.
export class UsageTally {
  private input = NO_TOKENS;
  private cachedInput = NO_TOKENS;
  private output = NO_TOKENS;
  private total = NO_TOKENS;

  add(usage: AgentUsage): void {
    this.input += usage.input;
    this.cachedInput += usage.cachedInput;
    this.output += usage.output;
    this.total += usage.total;
  }

  snapshot(): AgentUsage {
    return {
      input: this.input,
      cachedInput: this.cachedInput,
      output: this.output,
      total: this.total,
    };
  }
}
