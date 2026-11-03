export const REQUEST_HEADER = 'Request (verbatim):';
export const EXISTING_PROJECT_LINE = 'Workspace: an existing project.';
export const EMPTY_WORKSPACE_LINE = 'Workspace: empty, there is no project yet.';
export const DOCUMENTS_LABEL = 'Project documents present:';
export const NO_DOCUMENTS = 'none';
export const PREVIOUS_FAILURES_HEADER = 'Previously attempted in this workspace and failed:';
export const ATTEMPTS_SEPARATOR = ' — ';
export const ABANDONED_LABEL = ', abandoned: ';
// A failed step whose reason was never recorded is still worth showing: the attempt count is
// the fact, and the planner must not read a missing reason as "it went fine".
export const NO_FAILURE_REASON = 'no reason recorded';
export const MAX_FAILURE_REASON_CHARACTERS = 300;

export const ANSWERS_HEADER = 'Your earlier questions and the answers:';
export const QUESTION_LABEL = 'Q:';
export const ANSWER_LABEL = 'A:';

// What the code passes as the answer of an unattended run, so the plan is made anyway.
export const NO_ANSWER_GIVEN =
  'no answer: choose the most reasonable option and record it in assumptions';

export const PLAN_TITLE = '# Plan';
export const PLAN_ASSUMPTIONS_TITLE = '## Assumptions';
export const PLAN_GENERATED_LABEL = 'Generated';
export const PLAN_CHECKBOX = '- [ ] ';
