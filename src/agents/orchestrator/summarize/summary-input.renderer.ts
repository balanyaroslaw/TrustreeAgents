import type { DeferredIssue } from '../decide/step-decision.types';
import {
  ASSUMPTIONS_HEADER,
  DEFERRED_HEADER,
  NO_STEP_SUMMARY,
  PLAN_HEADER,
  REQUEST_HEADER,
  STEPS_HEADER,
} from './summary-input.constants';
import type { StepOutcome, SummaryInputPacket } from './summary-input.types';

const SECTION_SEPARATOR = '\n\n';
const LINE_SEPARATOR = '\n';
const BULLET = '- ';
const EMPTY = 0;

export class SummaryInputRenderer {
  static render(packet: SummaryInputPacket): string {
    const sections = [
      [REQUEST_HEADER, packet.userPrompt.trim()].join(LINE_SEPARATOR),
      `${PLAN_HEADER} ${packet.plan.summary}`,
      SummaryInputRenderer.steps(packet.steps),
      SummaryInputRenderer.assumptions(packet.plan.assumptions),
      SummaryInputRenderer.deferred(packet.deferredIssues),
    ];

    return sections.filter((section) => section !== null).join(SECTION_SEPARATOR);
  }

  private static steps(steps: readonly StepOutcome[]): string | null {
    if (steps.length === EMPTY) {
      return null;
    }
    const lines = steps.map(
      (step) =>
        `${BULLET}Step ${step.index} (${step.decision}) ${step.title}: ` +
        `${step.summary === '' ? NO_STEP_SUMMARY : step.summary}`,
    );

    return [STEPS_HEADER, ...lines].join(LINE_SEPARATOR);
  }

  private static assumptions(assumptions: readonly string[]): string | null {
    if (assumptions.length === EMPTY) {
      return null;
    }
    return [ASSUMPTIONS_HEADER, ...assumptions.map((item) => `${BULLET}${item}`)].join(
      LINE_SEPARATOR,
    );
  }

  private static deferred(deferred: readonly DeferredIssue[]): string | null {
    if (deferred.length === EMPTY) {
      return null;
    }
    const lines = deferred.map((entry) => `${BULLET}${entry.issue} (${entry.reason})`);

    return [DEFERRED_HEADER, ...lines].join(LINE_SEPARATOR);
  }
}
