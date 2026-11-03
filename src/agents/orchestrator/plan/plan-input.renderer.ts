import { InputSectionRenderer } from '../../context/input-section.renderer';
import type { FailedStepSummary } from './failed-step.types';
import {
  ABANDONED_LABEL,
  ANSWERS_HEADER,
  ANSWER_LABEL,
  ATTEMPTS_SEPARATOR,
  DOCUMENTS_LABEL,
  EMPTY_WORKSPACE_LINE,
  EXISTING_PROJECT_LINE,
  MAX_FAILURE_REASON_CHARACTERS,
  NO_DOCUMENTS,
  NO_FAILURE_REASON,
  PREVIOUS_FAILURES_HEADER,
  QUESTION_LABEL,
  REQUEST_HEADER,
} from './plan-input.constants';
import type { AnsweredQuestion, PlanInputPacket } from './plan-input.types';

const SECTION_SEPARATOR = '\n\n';
const LINE_SEPARATOR = '\n';
const NAME_SEPARATOR = ', ';
const ANSWER_INDENT = '   ';
const BULLET = '- ';
const QUOTE = '"';
const FIRST_ITEM = 1;
const SINGLE = 1;
const EMPTY = 0;

export class PlanInputRenderer {
  static render(packet: PlanInputPacket): string {
    const sections = [
      [REQUEST_HEADER, packet.userPrompt.trim()].join(LINE_SEPARATOR),
      PlanInputRenderer.workspace(packet),
      PlanInputRenderer.failures(packet.previousFailures),
      PlanInputRenderer.answers(packet.previousQuestionsAndAnswers),
    ];

    return sections.filter((section) => section !== null).join(SECTION_SEPARATOR);
  }

  private static workspace(packet: PlanInputPacket): string {
    const documents =
      packet.workspaceDocuments.length === EMPTY
        ? NO_DOCUMENTS
        : packet.workspaceDocuments.join(NAME_SEPARATOR);

    return [
      packet.isExistingProject ? EXISTING_PROJECT_LINE : EMPTY_WORKSPACE_LINE,
      `${DOCUMENTS_LABEL} ${documents}`,
    ].join(LINE_SEPARATOR);
  }

  // What was tried here before and did not work. Omitted entirely when there is no such
  // history, so a first run in a workspace reads exactly as it did before.
  private static failures(failures: readonly FailedStepSummary[]): string | null {
    if (failures.length === EMPTY) {
      return null;
    }
    const lines = failures.map((failure) => `${BULLET}${PlanInputRenderer.failure(failure)}`);

    return [PREVIOUS_FAILURES_HEADER, ...lines].join(LINE_SEPARATOR);
  }

  private static failure(failure: FailedStepSummary): string {
    const attempts = `${failure.attempts} ${PlanInputRenderer.plural(failure.attempts, 'attempt')}`;

    return [
      `${QUOTE}${failure.title}${QUOTE}${ATTEMPTS_SEPARATOR}${attempts}`,
      PlanInputRenderer.reason(failure.reason),
    ].join(ABANDONED_LABEL);
  }

  private static reason(reason: string): string {
    const trimmed = reason.trim();

    return trimmed === ''
      ? NO_FAILURE_REASON
      : InputSectionRenderer.trimmed(trimmed, MAX_FAILURE_REASON_CHARACTERS);
  }

  private static plural(count: number, singular: string): string {
    return count === SINGLE ? singular : `${singular}s`;
  }

  private static answers(answered: readonly AnsweredQuestion[]): string | null {
    if (answered.length === EMPTY) {
      return null;
    }
    const lines = answered.flatMap((entry, index) => [
      `${index + FIRST_ITEM}. ${QUESTION_LABEL} ${entry.question}`,
      `${ANSWER_INDENT}${ANSWER_LABEL} ${entry.answer}`,
    ]);

    return [ANSWERS_HEADER, ...lines].join(LINE_SEPARATOR);
  }
}
