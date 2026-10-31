import type { ChangedCodeLabels } from '../../context/input-section.types';

export const BRIEF_CHANGED_CODE_LABELS: ChangedCodeLabels = {
  header: 'Files the Developer changed in this step (from git):',
  source: 'Source:',
  tests: 'Tests:',
  other: 'Other files:',
};

export const BRIEF_DEVELOPER_NOTES_HEADER = 'Developer report (what the Developer says it did):';
export const BRIEF_MAX_LISTED_FILES = 30;
