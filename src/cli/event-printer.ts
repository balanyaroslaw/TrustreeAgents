import { AgentEventKind } from '../events/agent-event-kind.enum';
import type { AgentEvent, AgentEventListener } from '../events/agent-event.types';
import { CompactNumberFormatter } from '../agents/utils/compact-number.formatter';
import { DurationFormatter } from '../agents/utils/duration.formatter';
import type { RunPlanStep } from '../agents/orchestrator/plan/run-plan.types';
import {
  ACCEPTED_LABEL,
  ATTEMPT_LABEL,
  BUDGET_LABEL,
  DECISION_LABEL,
  EVENT_PREFIX,
  FAILED_LABEL,
  FINISHED_LABEL,
  NO_COMMIT_LABEL,
  OVERRIDDEN_LABEL,
  PLAN_LABEL,
  QUESTIONS_LABEL,
  RUN_LABEL,
  STARTED_LABEL,
  STEP_FAILED_LABEL,
  STEP_LABEL,
  TOKENS_LABEL,
  TOOL_LABEL,
} from './event-printer.constants';

const FIELD_SEPARATOR = ' | ';
const NAME_SEPARATOR = ', ';
const FIRST_ITEM = 1;
const STEP_INDENT = '      ';
const CRITERION_INDENT = '        - ';
const NO_TOKENS = 0;

// Prints what the run is doing while it works: status and the plan, never generated prose. The
// plan is the one multi-line entry, because the user has to see what will be executed.
export class EventPrinter implements AgentEventListener {
  // The last budget figure printed, so a run of calls that spend nothing prints one line, not one
  // per call.
  private lastSpent: number | null = null;

  onEvent(event: AgentEvent): void {
    if (event.kind === AgentEventKind.BudgetUpdated) {
      if (event.spent === this.lastSpent) {
        return;
      }
      this.lastSpent = event.spent;
    }
    const line = EventPrinter.lineOf(event);
    if (line !== null) {
      console.log(`${EVENT_PREFIX}${line}`);
    }
    if (event.kind === AgentEventKind.PlanCreated) {
      console.log(EventPrinter.planOf(event.plan));
    }
  }

  // The plan as the user has to read it before the steps run: one title per step with its
  // acceptance criteria under it.
  private static planOf(steps: readonly RunPlanStep[]): string {
    return steps
      .flatMap((step, index) => [
        `${STEP_INDENT}${index + FIRST_ITEM}. ${step.title}`,
        ...step.acceptanceCriteria.map((criterion) => `${CRITERION_INDENT}${criterion}`),
      ])
      .join('\n');
  }

  private static lineOf(event: AgentEvent): string | null {
    return EventPrinter.runLineOf(event) ?? EventPrinter.callLineOf(event);
  }

  // The events of the run itself: the plan, the steps, the attempts and the decisions.
  private static runLineOf(event: AgentEvent): string | null {
    if (event.kind === AgentEventKind.PlanCreated) {
      return `${PLAN_LABEL} ${event.steps} steps: ${event.summary}`;
    }
    if (event.kind === AgentEventKind.PlanQuestions) {
      return `${QUESTIONS_LABEL} ${event.questions.join(NAME_SEPARATOR)}`;
    }
    if (event.kind === AgentEventKind.StepStarted) {
      return `${STEP_LABEL} ${event.index}/${event.total} ${STARTED_LABEL}: ${event.title}`;
    }
    if (event.kind === AgentEventKind.AttemptStarted) {
      return (
        `${STEP_LABEL} ${event.index} ${ATTEMPT_LABEL} ${event.attempt}` +
        `/${event.maxAttempts} ${STARTED_LABEL}`
      );
    }
    if (event.kind === AgentEventKind.DecisionMade) {
      return (
        `${STEP_LABEL} ${event.index} ${ATTEMPT_LABEL} ${event.attempt} ` +
        `${DECISION_LABEL} ${event.decision}: ${event.reason}`
      );
    }
    if (event.kind === AgentEventKind.DecisionOverridden) {
      return (
        `${STEP_LABEL} ${event.index} ${ATTEMPT_LABEL} ${event.attempt} ` +
        `${OVERRIDDEN_LABEL} ${event.original} -> ${event.effective}: ` +
        `${event.reasons.join(NAME_SEPARATOR)}`
      );
    }
    if (event.kind === AgentEventKind.StepAccepted) {
      const commit = event.commitSha === null ? NO_COMMIT_LABEL : event.commitSha;
      return `${STEP_LABEL} ${event.index} ${ACCEPTED_LABEL} (${commit}): ${event.summary}`;
    }
    if (event.kind === AgentEventKind.StepFailed) {
      return `${STEP_LABEL} ${event.index} ${STEP_FAILED_LABEL} ${event.reason}`;
    }
    if (event.kind === AgentEventKind.BudgetUpdated) {
      return (
        `${BUDGET_LABEL} ${CompactNumberFormatter.format(event.spent)} spent, ` +
        `${CompactNumberFormatter.format(event.remaining)} of ` +
        `${CompactNumberFormatter.format(event.limit)} left`
      );
    }
    if (event.kind === AgentEventKind.RunFinished) {
      return `${RUN_LABEL} ${event.status}`;
    }

    return null;
  }

  // The events of one agent call.
  private static callLineOf(event: AgentEvent): string | null {
    if (event.kind === AgentEventKind.AgentStarted) {
      return `${EventPrinter.who(event.origin.role, event.origin.task)} ${STARTED_LABEL}`;
    }
    if (event.kind === AgentEventKind.ToolCalled) {
      const summary = event.summary === '' ? '' : ` ${event.summary}`;
      return `${TOOL_LABEL} ${event.tool}${summary}`;
    }
    if (event.kind === AgentEventKind.TokensUsed) {
      // A call that used no tokens has nothing to report, as in a dry run.
      if (event.total === NO_TOKENS) {
        return null;
      }
      return (
        `${TOKENS_LABEL} ${CompactNumberFormatter.format(event.input)} in ` +
        `(${CompactNumberFormatter.format(event.cachedInput)} cached) / ` +
        `${CompactNumberFormatter.format(event.output)} out`
      );
    }
    if (event.kind === AgentEventKind.AgentFinished) {
      const outcome = event.failure === null ? FINISHED_LABEL : `${FAILED_LABEL} ${event.failure}`;
      return (
        `${EventPrinter.who(event.origin.role, event.origin.task)} ${outcome}` +
        `${FIELD_SEPARATOR}${event.toolCalls} tool calls` +
        `${FIELD_SEPARATOR}${DurationFormatter.format(event.durationMs)}`
      );
    }
    return null;
  }

  private static who(role: string, task: string | null): string {
    return task === null ? role : `${role} (${task})`;
  }
}
