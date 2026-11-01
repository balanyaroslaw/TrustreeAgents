import type { TableColumn } from './table.types';

export const HISTORY_COLUMNS: readonly TableColumn[] = [
  { header: 'RUN' },
  { header: 'STARTED' },
  { header: 'STATUS' },
  { header: 'TIME', numeric: true },
  { header: 'STEPS', numeric: true },
  { header: 'TOKENS', numeric: true },
  { header: 'COST', numeric: true },
  { header: 'PROMPT' },
];

export const MAX_PROMPT_CHARACTERS = 60;
export const SHORT_SHA_LENGTH = 8;
export const RUNNING_DURATION = '-';
export const PLAN_HEADER = 'Plan:';
export const STEPS_HEADER = 'Steps:';
export const ATTEMPT_LABEL = 'attempt';
export const OVERRIDDEN_LABEL = 'overridden';
export const NO_COMMIT = 'no commit';
export const NO_SUMMARY = 'no summary';
export const NO_DECISION = 'no decision';
export const ASSUMPTIONS_HEADER = 'Assumptions:';
export const REPORT_LABEL = 'Report:';
export const BRANCH_LABEL = 'Branch:';
