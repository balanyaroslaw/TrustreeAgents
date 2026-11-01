import type { AgentUsage } from '../agents/agent-invocation.types';
import { ExecutionMessages } from '../execution.messages';
import { BudgetExhaustedError } from './budget-exhausted.error';

const NO_TOKENS = 0;

// Counts the tokens of every agent call of one run, failed calls included. One instance per run.
export class RunBudget {
  private spentTokens = NO_TOKENS;

  constructor(private readonly limit: number) {}

  // Charges first and then refuses: what was spent is always counted, even by the call that
  // exhausts the budget.
  charge(usage: AgentUsage): void {
    this.spentTokens += usage.total;
    if (this.spentTokens >= this.limit) {
      throw new BudgetExhaustedError(
        this.spentTokens,
        this.limit,
        ExecutionMessages.budgetExhausted(this.spentTokens, this.limit),
      );
    }
  }

  assertRoom(reserve: number): void {
    if (this.remaining() < reserve) {
      throw new BudgetExhaustedError(
        this.spentTokens,
        this.limit,
        ExecutionMessages.budgetTooSmall(this.remaining(), reserve),
      );
    }
  }

  allows(reserve: number): boolean {
    return this.remaining() >= reserve;
  }

  remaining(): number {
    return Math.max(NO_TOKENS, this.limit - this.spentTokens);
  }

  spent(): number {
    return this.spentTokens;
  }

  total(): number {
    return this.limit;
  }
}
