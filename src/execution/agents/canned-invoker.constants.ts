// The file the canned Developer writes, and the test file the canned QA reports. They are real
// writes, so git produces a real diff and the run produces real commits.
export const CANNED_SOURCE_FILE = 'dry-run/health.ts';
export const CANNED_TEST_FILE = 'dry-run/health.spec.ts';

export const CANNED_FULL_TEST_COMMAND = 'npm test';
export const CANNED_TEST_OUTPUT_TAIL = 'Tests: 2 passed, 2 total';

// The sequence numbers of the canned recorder facts: the test file is written before the suite
// runs, so QA's full run counts as fresh.
export const CANNED_CHANGE_SEQUENCE = 1;
export const CANNED_RUN_SEQUENCE = 2;

export const CANNED_PLAN_STEPS = 2;
export const CANNED_SCORE = 4;
export const CANNED_DURATION_MS = 0;
export const CANNED_TOOL_CALLS = 0;
export const CANNED_EXIT_CODE = 0;

// The model name a dry run records its calls under, so no dry run can be mistaken for a paid one.
export const CANNED_MODEL = 'dry-run';
