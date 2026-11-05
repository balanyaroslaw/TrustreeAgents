export const REWORK_FOCUS_HEADER = 'What must change (from the Orchestrator):';
export const QA_DEFECTS_HEADER = 'Defects QA found (verbatim):';
export const REVIEW_ISSUES_HEADER = 'Blocking issues the Reviewer raised (verbatim):';
export const DEFERRED_HEADER = 'Deliberately out of scope for this attempt, do not work on these:';

export const DIFF_STAT_HEADER = 'What you changed in this step so far:';
export const REFERENCED_CODE_HEADER = 'The code around each blocking issue:';
export const PREVIOUS_ATTEMPTS_HEADER = 'Earlier attempts at this step:';

// Limits of the front-loaded parts. They exist to trade many tool calls for a bounded number of
// characters in the first request: raising them raises the cost of every rework attempt.
export const MAX_FAILING_OUTPUT_CHARACTERS = 3_000;
export const EXCERPT_CONTEXT_LINES = 40;
export const MAX_CODE_EXCERPTS = 6;
export const MAX_EXCERPT_TOTAL_LINES = 400;
// Two issues in one file closer than this share a single excerpt instead of overlapping.
export const EXCERPT_MERGE_DISTANCE_LINES = 80;
export const MAX_DIFF_STAT_LINES = 60;
export const MAX_PREVIOUS_ATTEMPT_CHARACTERS = 200;
export const MAX_PREVIOUS_STOP_PATHS = 10;
// The whole assembled brief, issue list included, must fit in this.
export const MAX_REWORK_BRIEF_CHARACTERS = 12_000;
