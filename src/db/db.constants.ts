import {
  AgentRole as DbAgentRole,
  DecisionKind as DbDecisionKind,
  RunStatus as DbRunStatus,
  StepStatus as DbStepStatus,
} from '@prisma/client';
import { AgentRole } from '../agents/agent-role.enum';
import { StepDecisionKind } from '../agents/orchestrator/decide/step-decision.enum';
import { RunStatus } from '../execution/run-status.enum';
import { StepStatus } from '../execution/step-status.enum';

// The enums of the code and the enums of the database are mapped explicitly, so renaming one
// never silently changes the other.
export const RUN_STATUS_TO_DB: Readonly<Record<RunStatus, DbRunStatus>> = {
  [RunStatus.Running]: DbRunStatus.running,
  [RunStatus.Completed]: DbRunStatus.completed,
  [RunStatus.Failed]: DbRunStatus.failed,
  [RunStatus.Cancelled]: DbRunStatus.cancelled,
};

export const RUN_STATUS_FROM_DB: Readonly<Record<DbRunStatus, RunStatus>> = {
  [DbRunStatus.running]: RunStatus.Running,
  [DbRunStatus.completed]: RunStatus.Completed,
  [DbRunStatus.failed]: RunStatus.Failed,
  [DbRunStatus.cancelled]: RunStatus.Cancelled,
};

export const STEP_STATUS_TO_DB: Readonly<Record<StepStatus, DbStepStatus>> = {
  [StepStatus.Pending]: DbStepStatus.pending,
  [StepStatus.InProgress]: DbStepStatus.in_progress,
  [StepStatus.Accepted]: DbStepStatus.accepted,
  [StepStatus.Failed]: DbStepStatus.failed,
  [StepStatus.Skipped]: DbStepStatus.skipped,
};

export const STEP_STATUS_FROM_DB: Readonly<Record<DbStepStatus, StepStatus>> = {
  [DbStepStatus.pending]: StepStatus.Pending,
  [DbStepStatus.in_progress]: StepStatus.InProgress,
  [DbStepStatus.accepted]: StepStatus.Accepted,
  [DbStepStatus.failed]: StepStatus.Failed,
  [DbStepStatus.skipped]: StepStatus.Skipped,
};

export const AGENT_ROLE_TO_DB: Readonly<Record<AgentRole, DbAgentRole>> = {
  [AgentRole.Orchestrator]: DbAgentRole.orchestrator,
  [AgentRole.Developer]: DbAgentRole.developer,
  [AgentRole.Qa]: DbAgentRole.qa,
  [AgentRole.Reviewer]: DbAgentRole.reviewer,
};

export const AGENT_ROLE_FROM_DB: Readonly<Record<DbAgentRole, AgentRole>> = {
  [DbAgentRole.orchestrator]: AgentRole.Orchestrator,
  [DbAgentRole.developer]: AgentRole.Developer,
  [DbAgentRole.qa]: AgentRole.Qa,
  [DbAgentRole.reviewer]: AgentRole.Reviewer,
};

export const DECISION_KIND_TO_DB: Readonly<Record<StepDecisionKind, DbDecisionKind>> = {
  [StepDecisionKind.Accept]: DbDecisionKind.accept,
  [StepDecisionKind.Rework]: DbDecisionKind.rework,
  [StepDecisionKind.Abort]: DbDecisionKind.abort,
};

export const DECISION_KIND_FROM_DB: Readonly<Record<DbDecisionKind, StepDecisionKind>> = {
  [DbDecisionKind.accept]: StepDecisionKind.Accept,
  [DbDecisionKind.rework]: StepDecisionKind.Rework,
  [DbDecisionKind.abort]: StepDecisionKind.Abort,
};

export const AGENT_CALL_OK_STATUS = 'ok';
export const AGENT_CALL_ERROR_STATUS = 'error';

export const UNASSIGNED_STEP_LABEL = 'outside the plan';
export const MODEL_NAME_SEPARATOR = ', ';
export const NO_MODEL = 'n/a';

export const PRISMA_CLI_RELATIVE_PATH = 'node_modules/prisma/build/index.js';
export const MIGRATION_ARGS: readonly string[] = ['migrate', 'deploy'];
export const MIGRATION_TIMEOUT_MS = 60_000;

export const DATABASE_UNREACHABLE_MESSAGE = 'Database is not reachable. Run: npm run db:up';
export const DATABASE_EXIT_CODE = 1;

export const DEFAULT_RECENT_RUNS = 10;
export const DEFAULT_PRUNE_DAYS = 30;
