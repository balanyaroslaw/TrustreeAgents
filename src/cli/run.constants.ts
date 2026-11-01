export const RUN_EXIT_CODE = 1;
export const CANCELLED_EXIT_CODE = 130;

export const MISSING_PROMPT_MESSAGE =
  'run: give the task as the first argument, for example: team run "add a health endpoint"';
export const INVALID_BUDGET_MESSAGE = 'run: --budget must be a positive whole number of tokens';
export const INVALID_MAX_STEPS_MESSAGE = 'run: --max-steps must be a positive whole number';

export const DRY_RUN_NOTICE =
  'dry run: no model is called and nothing is spent; the answers are canned';
export const BUDGET_LABEL = 'budget:';
export const MODELS_LABEL = 'models:';
export const DRY_RUN_MODELS = 'none (dry run)';

export const STATUS_LABEL = 'status:';
export const BRANCH_LABEL = 'branch:';
export const STEPS_LABEL = 'steps:';
export const REPORT_LABEL = 'report:';
export const TOKENS_LABEL = 'tokens:';
export const COST_LABEL = 'cost:';
export const STOPPED_LABEL = 'stopped:';
export const NOT_AVAILABLE = '-';
