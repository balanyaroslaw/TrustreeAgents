import type { ChangedCodeLabels } from './input-section.types';

export const DEVELOPER_CHANGED_CODE_LABELS: ChangedCodeLabels = {
  header: 'What your previous attempt changed (from git):',
  source: 'Source:',
  tests: 'Tests:',
  other: 'Other files:',
};

export const DEVELOPER_MAX_LISTED_FILES = 30;

export const REWORK_HEADER =
  'This step was not accepted. Fix the following, keeping what already works:';
export const SYSTEM_NOTE_HEADER = 'What the system recorded about your previous attempt:';
