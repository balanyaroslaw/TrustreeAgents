import { AgentFailureKind } from '../agents/agent-failure.enum';

export const REPORT_TITLE_PREFIX = '# Run';
export const REQUEST_HEADER = '## Request';
export const PLAN_HEADER = '## Plan';
export const ASSUMPTIONS_HEADER = '### Assumptions';
export const QUESTIONS_HEADER = '### Open questions';
export const STEPS_HEADER = '## Steps';
export const DEFERRED_HEADER = '## Deferred findings';
export const NOT_DONE_HEADER = '## Not done';
export const FOLLOW_UPS_HEADER = '## Follow-ups';
export const OVERVIEW_HEADER = '## What the run delivered';
export const METRICS_HEADER = '## Metrics';
export const AGENT_TABLE_HEADER = '| Agent | Calls | Tokens | Tool calls | Commands |';
export const AGENT_TABLE_RULE = '| --- | --- | --- | --- | --- |';
export const STEP_TABLE_HEADER = '| Step | Tokens | Tool calls | Commands |';
export const STEP_TABLE_RULE = '| --- | --- | --- | --- |';

export const BRANCH_LABEL = 'Branch';
export const STATUS_LABEL = 'Status';
export const DURATION_LABEL = 'Duration';
export const STOPPED_LABEL = 'Stopped';
export const SUMMARY_LABEL = 'Summary';
export const COMMIT_LABEL = 'Commit';
export const ATTEMPTS_LABEL = 'Attempts';
export const QA_LABEL = 'QA';
export const REVIEW_LABEL = 'Review';
export const OVERRIDES_LABEL = 'Guard overrides';
export const REASON_LABEL = 'Reason';
export const NOTE_LABEL = 'Note';
export const TOKENS_LABEL = 'Tokens';
export const CUT_OFF_LABEL = 'Ended early';
export const CUT_OFF_ATTEMPT_LABEL = 'attempt';
export const CUT_OFF_TOKENS_LABEL = 'tokens';

// A call that ended on one of these did not end on an answer of its own: the code stopped it,
// so the report says so instead of leaving a short report looking like a complete one.
export const CUT_OFF_FAILURES: readonly AgentFailureKind[] = [
  AgentFailureKind.MaxTurns,
  AgentFailureKind.BudgetExceeded,
];

export const NO_COMMIT = 'none';
export const NO_BRANCH = 'none';
export const NOT_RUN = 'not run';
