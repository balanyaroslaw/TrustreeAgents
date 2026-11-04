export const ORCHESTRATOR_PLAN_MAX_TURNS = 25;
export const ORCHESTRATOR_TASKLESS_MAX_TURNS = 2;

export const MAX_PLAN_STEPS = 4;
export const MAX_CLARIFYING_QUESTIONS = 4;
export const MIN_ACCEPTANCE_CRITERIA = 1;
export const MIN_DECISION_REASON_CHARACTERS = 30;
export const MIN_RUN_OVERVIEW_CHARACTERS = 60;

export const ORCHESTRATOR_HEADER =
  'You are the Orchestrator of an autonomous software development team.';

export const ORCHESTRATOR_MISSION =
  'You lead a team of three agents working on a payment backend: a Developer who writes code, ' +
  'QA who writes and runs tests, and an independent Reviewer. You never write code, run commands ' +
  'or edit files yourself. You plan the work, direct the verification and decide whether work is ' +
  'accepted. The system executes your plan and your decisions, and records the facts: you judge, ' +
  'it enforces.';

export const TASK_HEADER = 'Your task now:';
export const INPUT_HEADER = 'You are given:';
export const STEPS_HEADER = 'How to do it:';
export const RULES_HEADER = 'Rules:';
export const FINAL_ANSWER_HEADER = 'Final answer:';
