import type { TableColumn } from './table.types';

export const TOOL_COLUMNS: readonly TableColumn[] = [
  { header: 'TOOL' },
  { header: 'WRITES' },
  { header: 'APPROVAL' },
  { header: 'SUMMARY' },
];

export const WRITES_LABEL = 'yes';
export const READ_ONLY_LABEL = 'no';
export const APPROVAL_LABEL = 'yes';
export const NO_APPROVAL_LABEL = 'no';
export const TOOL_ROLES_HEADER = 'Tools per role:';
