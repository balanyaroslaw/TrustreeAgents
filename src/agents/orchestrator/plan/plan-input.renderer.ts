import {
  ANSWERS_HEADER,
  ANSWER_LABEL,
  DOCUMENTS_LABEL,
  EMPTY_WORKSPACE_LINE,
  EXISTING_PROJECT_LINE,
  NO_DOCUMENTS,
  QUESTION_LABEL,
  REQUEST_HEADER,
} from './plan-input.constants';
import type { AnsweredQuestion, PlanInputPacket } from './plan-input.types';

const SECTION_SEPARATOR = '\n\n';
const LINE_SEPARATOR = '\n';
const NAME_SEPARATOR = ', ';
const ANSWER_INDENT = '   ';
const FIRST_ITEM = 1;
const EMPTY = 0;

export class PlanInputRenderer {
  static render(packet: PlanInputPacket): string {
    const sections = [
      [REQUEST_HEADER, packet.userPrompt.trim()].join(LINE_SEPARATOR),
      PlanInputRenderer.workspace(packet),
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
