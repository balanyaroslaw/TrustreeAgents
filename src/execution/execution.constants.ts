import { AgentRole } from '../agents/agent-role.enum';
import type { DefinedAgentRole } from '../agents/agent-definition.types';
import type { GitIdentity } from '../workspace/git/git.types';

export const MAX_STEP_ATTEMPTS = 3;

// The order the agents run in within one attempt. They run sequentially, never in parallel: QA
// writes test files while the Reviewer reads the tree. Reordering this list reorders the step.
export const STEP_AGENT_SEQUENCE: readonly DefinedAgentRole[] = [
  AgentRole.Developer,
  AgentRole.Qa,
  AgentRole.Reviewer,
];

export const DEFAULT_TOKEN_BUDGET = 2_000_000;

// What `team run` uses when no --budget is given. A real run spends money, so the default is the
// conservative one and the large budget above has to be asked for.
export const CONSERVATIVE_TOKEN_BUDGET = 200_000;
export const DEFAULT_RUN_TIMEOUT_MS = 2 * 60 * 60 * 1_000;
export const AGENT_RETRY_ATTEMPTS = 1;

// The plan call plus one re-plan with the answers to the clarifying questions.
export const MAX_PLAN_ATTEMPTS = 2;

export const FIRST_ATTEMPT = 1;
export const FIRST_STEP_INDEX = 1;

export const RUN_BRANCH_PREFIX = 'agent/run-';
export const SHORT_RUN_ID_LENGTH = 8;

export const PLAN_FILE_NAME = 'PLAN.md';
export const REPORT_DIRECTORY_NAME = 'reports';
export const REPORT_FILE_PREFIX = 'run-';
export const REPORT_FILE_EXTENSION = '.md';
export const GITIGNORE_FILE_NAME = '.gitignore';

export const DEFAULT_GITIGNORE_ENTRIES: readonly string[] = [
  'node_modules',
  'dist',
  '.env',
  '*.tmp',
];

// Secrets are never staged, whatever the .gitignore of the workspace says.
export const ENV_STAGE_EXCLUDES: readonly string[] = [
  ':(exclude,glob)**/.env',
  ':(exclude,glob)**/.env.*',
];

// Used only when the workspace has no git identity of its own, and passed per commit instead of
// written into the repository configuration.
export const AGENT_GIT_IDENTITY: GitIdentity = {
  name: 'Trustee Agent',
  email: 'agent@trustee.local',
};

// Files whose presence tells the Orchestrator that the workspace already carries a project.
export const PROJECT_DOCUMENT_NAMES: readonly string[] = [
  'README.md',
  'CONVENTIONS.md',
  'ARCHITECTURE.md',
  'CONTRIBUTING.md',
  'CLAUDE.md',
  'PLAN.md',
  'package.json',
];

// The most one agent call may spend, whatever the run budget still allows. The budget is only
// checked between calls, so without this a single call can overshoot the whole run: the cap is
// what the invoker aborts the call on, and RunBudget.callCap() narrows it to what is left.
export const MAX_TOKENS_PER_AGENT_CALL = 1_000_000;

// Tokens that must stay available: a required agent call needs the first, the optional
// Orchestrator calls (Brief, Summarize) are skipped below the second.
export const REQUIRED_CALL_TOKEN_RESERVE = 20_000;
export const OPTIONAL_CALL_TOKEN_RESERVE = 80_000;

export const MAX_LISTED_DIRTY_PATHS = 8;

export const IMMEDIATE_EXIT_CODE = 130;

export const AGENT_INVOKER_FACTORY = 'AGENT_INVOKER_FACTORY';
export const USER_PROMPTER = 'USER_PROMPTER';
// How many previously failed steps of this project the planner is shown. Enough to see a
// pattern, few enough that the history never crowds out the request.
export const MAX_PREVIOUS_FAILURES = 8;

export const PLAN_REPOSITORY = 'PLAN_REPOSITORY';
export const ATTEMPT_REPOSITORY = 'ATTEMPT_REPOSITORY';
