import type { ChangedCodeLabels } from './input-section.types';

export const MAX_BRIEF_FOCUS_ITEMS = 6;
export const MAX_BRIEF_RISK_ITEMS = 4;
export const MAX_BRIEF_INTERFACE_ITEMS = 8;

export const MAX_DEVELOPER_SUMMARY_CHARACTERS = 800;
export const MAX_CHANGE_DESCRIPTION_CHARACTERS = 200;
export const MAX_LISTED_DECISIONS = 5;
export const MAX_LISTED_OPEN_ISSUES = 5;
export const MAX_LISTED_COMPLETED_STEPS = 5;
export const TRUNCATION_SUFFIX = '...';

export const QA_CHANGED_CODE_LABELS: ChangedCodeLabels = {
  header: 'Changed code in this step (from git; this is the scope of your tests):',
  source: 'Source:',
  tests: 'Existing tests changed:',
  other: 'Other files (not test targets):',
};
export const CRITERIA_HEADER = 'Acceptance criteria:';
export const DEVELOPER_NOTES_HEADER = 'Developer notes (claims; verify them against the code):';
export const BRIEF_HEADER =
  'Focus from the Orchestrator (guidance only; you must still cover every acceptance criterion):';
export const COMPLETED_STEPS_HEADER = 'Completed steps so far:';
export const PREVIOUS_DEFECTS_HEADER =
  'Defects you reported in the previous attempt (verify they are fixed and keep their tests):';
export const CHANGED_INTERFACES_LABEL = 'Changed interfaces (check them against the diff):';
