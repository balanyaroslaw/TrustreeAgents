import type { ChangedCodeLabels } from './input-section.types';

export const REVIEW_CHANGED_CODE_LABELS: ChangedCodeLabels = {
  header: 'Changed code in this step (from git; this is the scope of your review):',
  source: 'Source:',
  tests: 'Tests:',
  other: 'Other files:',
};

export const QA_FACTS_HEADER = 'QA results (facts recorded by the system):';
export const QA_DEFECTS_HEADER = 'Defects reported by QA:';
export const PREVIOUS_ISSUES_HEADER =
  'Issues you raised in the previous attempt (check whether they are fixed):';
export const CHECKLIST_HEADER =
  'Payment checklist (answer every id in the checklist field of your final answer):';
