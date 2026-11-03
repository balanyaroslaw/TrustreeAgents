export enum AgentFailureKind {
  MaxTurns = 'max_turns',
  InvalidOutput = 'invalid_output',
  ApiError = 'api_error',
  Cancelled = 'cancelled',
  ToolFailure = 'tool_failure',
  BudgetExceeded = 'budget_exceeded',
}
