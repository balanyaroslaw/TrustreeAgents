export class BudgetExhaustedError extends Error {
  readonly spent: number;
  readonly limit: number;

  constructor(spent: number, limit: number, message: string) {
    super(message);
    this.name = 'BudgetExhaustedError';
    this.spent = spent;
    this.limit = limit;
  }
}
