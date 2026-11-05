import type { AgentRole } from '../agents/agent-role.enum';
import type { StepDecisionKind } from '../agents/orchestrator/decide/step-decision.enum';
import type { OrchestratorTask } from '../agents/orchestrator/orchestrator-task.enum';
import type { RunPlanStep } from '../agents/orchestrator/plan/run-plan.types';
import type { RunDiagnosis } from '../execution/diagnosis/run-diagnosis.types';
import type { RunStatus } from '../execution/run-status.enum';
import type { AgentEventKind } from './agent-event-kind.enum';

// Which agent call an event belongs to. Every agent event carries the step and the attempt, so a
// listener can group the calls of one attempt without knowing how the executor works.
export interface AgentCallOrigin {
  readonly role: AgentRole;
  readonly task: OrchestratorTask | null;
  readonly stepIndex: number | null;
  readonly attempt: number | null;
}

export interface RunEventBase {
  readonly runId: string;
  readonly at: number;
}

export interface PlanRequestedEvent extends RunEventBase {
  readonly kind: AgentEventKind.PlanRequested;
  readonly prompt: string;
  readonly planAttempt: number;
}

export interface PlanCreatedEvent extends RunEventBase {
  readonly kind: AgentEventKind.PlanCreated;
  readonly steps: number;
  readonly summary: string;
  // The steps themselves, so a listener can show what will be executed without asking anyone.
  readonly plan: readonly RunPlanStep[];
}

export interface PlanQuestionsEvent extends RunEventBase {
  readonly kind: AgentEventKind.PlanQuestions;
  readonly questions: readonly string[];
}

export interface StepStartedEvent extends RunEventBase {
  readonly kind: AgentEventKind.StepStarted;
  readonly index: number;
  readonly total: number;
  readonly title: string;
}

export interface AttemptStartedEvent extends RunEventBase {
  readonly kind: AgentEventKind.AttemptStarted;
  readonly index: number;
  readonly attempt: number;
  readonly maxAttempts: number;
}

export interface DecisionMadeEvent extends RunEventBase {
  readonly kind: AgentEventKind.DecisionMade;
  readonly index: number;
  readonly attempt: number;
  readonly decision: StepDecisionKind;
  readonly reason: string;
}

export interface DecisionOverriddenEvent extends RunEventBase {
  readonly kind: AgentEventKind.DecisionOverridden;
  readonly index: number;
  readonly attempt: number;
  readonly original: StepDecisionKind;
  readonly effective: StepDecisionKind;
  readonly reasons: readonly string[];
}

export interface StepAcceptedEvent extends RunEventBase {
  readonly kind: AgentEventKind.StepAccepted;
  readonly index: number;
  readonly commitSha: string | null;
  readonly summary: string;
}

export interface StepFailedEvent extends RunEventBase {
  readonly kind: AgentEventKind.StepFailed;
  readonly index: number;
  readonly reason: string;
}

export interface BudgetUpdatedEvent extends RunEventBase {
  readonly kind: AgentEventKind.BudgetUpdated;
  readonly spent: number;
  readonly remaining: number;
  readonly limit: number;
}

// Why a run that did not complete did not complete, computed by the executor from what the run
// recorded. The listener renders it; the core knows nothing about who listens.
export interface RunDiagnosedEvent extends RunEventBase {
  readonly kind: AgentEventKind.RunDiagnosed;
  readonly diagnosis: RunDiagnosis;
}

export interface RunFinishedEvent extends RunEventBase {
  readonly kind: AgentEventKind.RunFinished;
  readonly status: RunStatus;
  readonly reportPath: string | null;
  readonly branch: string | null;
}

export interface AgentStartedEvent extends RunEventBase {
  readonly kind: AgentEventKind.AgentStarted;
  readonly origin: AgentCallOrigin;
}

export interface ToolCalledEvent extends RunEventBase {
  readonly kind: AgentEventKind.ToolCalled;
  readonly origin: AgentCallOrigin;
  readonly tool: string;
  readonly summary: string;
}

export interface TokensUsedEvent extends RunEventBase {
  readonly kind: AgentEventKind.TokensUsed;
  readonly origin: AgentCallOrigin;
  readonly input: number;
  readonly cachedInput: number;
  readonly output: number;
  readonly total: number;
}

// One call was stopped because it spent more than a single call may spend. Both numbers are
// read from what the call actually used, so the terminal can name the agent and the spend.
export interface CallCapExceededEvent extends RunEventBase {
  readonly kind: AgentEventKind.CallCapExceeded;
  readonly origin: AgentCallOrigin;
  readonly spent: number;
  readonly cap: number;
}

export interface AgentFinishedEvent extends RunEventBase {
  readonly kind: AgentEventKind.AgentFinished;
  readonly origin: AgentCallOrigin;
  readonly toolCalls: number;
  readonly durationMs: number;
  readonly failure: string | null;
}

export type AgentEvent =
  | PlanRequestedEvent
  | PlanCreatedEvent
  | PlanQuestionsEvent
  | StepStartedEvent
  | AttemptStartedEvent
  | DecisionMadeEvent
  | DecisionOverriddenEvent
  | StepAcceptedEvent
  | StepFailedEvent
  | BudgetUpdatedEvent
  | RunDiagnosedEvent
  | RunFinishedEvent
  | AgentStartedEvent
  | ToolCalledEvent
  | TokensUsedEvent
  | CallCapExceededEvent
  | AgentFinishedEvent;

export interface AgentEventListener {
  onEvent(event: AgentEvent): void;
}
