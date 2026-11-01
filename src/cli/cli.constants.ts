export const DEFAULT_HISTORY_LIMIT = 10;
export const INVALID_ARGUMENT_EXIT_CODE = 1;

export const INVALID_LIMIT_MESSAGE = 'error: --limit must be a positive integer';
export const INVALID_DIMENSION_MESSAGE = 'error: --by must be one of agent, step, model';
export const INVALID_PRICE_MESSAGE =
  'error: --set needs --input, --cached and --output as non-negative numbers';
export const INVALID_DAYS_MESSAGE = 'error: --older-than must be a positive integer';
export const PRUNE_NEEDS_CONFIRMATION_MESSAGE =
  'error: nothing was deleted. Run it again with --yes, or in a terminal that can ask';
export const PRUNE_CANCELLED_MESSAGE = 'cancelled, nothing was deleted';
export const CONFIRMATION_ANSWER = 'yes';

export const TABLE_COLUMN_GAP = '  ';
export const TABLE_RULE_CHARACTER = '-';

export const AGENTS_TABLE_NAME_HEADER = 'NAME';
export const AGENTS_TABLE_ROLE_HEADER = 'ROLE';
export const AGENTS_TABLE_COLUMN_GAP = TABLE_COLUMN_GAP;
export const AGENTS_TABLE_RULE_CHARACTER = TABLE_RULE_CHARACTER;
