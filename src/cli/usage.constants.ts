import type { TableColumn } from './table.types';

export const AGENT_USAGE_COLUMNS: readonly TableColumn[] = [
  { header: 'AGENT' },
  { header: 'MODEL' },
  { header: 'INPUT (CACHED)', numeric: true },
  { header: 'OUTPUT', numeric: true },
  { header: 'TOTAL', numeric: true },
  { header: 'COST', numeric: true },
  { header: 'CALLS', numeric: true },
  { header: 'TIME', numeric: true },
];

export const STEP_USAGE_COLUMNS: readonly TableColumn[] = [
  { header: 'STEP' },
  { header: 'STATUS' },
  { header: 'ATTEMPTS', numeric: true },
  { header: 'MODEL' },
  { header: 'INPUT (CACHED)', numeric: true },
  { header: 'OUTPUT', numeric: true },
  { header: 'TOTAL', numeric: true },
  { header: 'COST', numeric: true },
  { header: 'CALLS', numeric: true },
  { header: 'TIME', numeric: true },
];

export const MODEL_USAGE_COLUMNS: readonly TableColumn[] = [
  { header: 'MODEL' },
  { header: 'INPUT (CACHED)', numeric: true },
  { header: 'OUTPUT', numeric: true },
  { header: 'TOTAL', numeric: true },
  { header: 'COST', numeric: true },
  { header: 'CALLS', numeric: true },
  { header: 'TIME', numeric: true },
];

export const TOTAL_LABEL = 'TOTAL';
export const RUN_HEADER_LABEL = 'Run';
export const STATUS_LABEL = 'status';
export const STARTED_LABEL = 'started';
export const NO_STATUS = '-';
export const NO_ATTEMPTS = '-';
