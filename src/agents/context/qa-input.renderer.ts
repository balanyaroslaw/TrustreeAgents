import { QA_MAX_LISTED_FILES } from '../qa/qa.constants';
import type { QaDefect } from '../qa/qa-result.types';
import { InputSectionRenderer } from './input-section.renderer';
import { PREVIOUS_DEFECTS_HEADER, QA_CHANGED_CODE_LABELS } from './qa-input.constants';
import { BRIEF_HEADER, CHANGED_INTERFACES_LABEL } from './qa-input.constants';
import type { QaBrief } from './qa-brief.types';
import type { QaInputPacket } from './qa-input.types';

const SECTION_SEPARATOR = '\n\n';
const LINE_SEPARATOR = '\n';
const BULLET = '- ';
const ENTRY_SEPARATOR = '; ';
const HEADER_ONLY = 1;
const FIRST_ATTEMPT = 1;
const EMPTY = 0;

export class QaInputRenderer {
  static render(packet: QaInputPacket): string {
    const sections = [
      InputSectionRenderer.step(packet.step),
      InputSectionRenderer.criteria(packet.step.acceptanceCriteria),
      InputSectionRenderer.changedCode(
        packet.changedCode,
        QA_CHANGED_CODE_LABELS,
        QA_MAX_LISTED_FILES,
      ),
      InputSectionRenderer.developerNotes(packet.developerNotes),
      QaInputRenderer.brief(packet.brief),
      InputSectionRenderer.completedSteps(packet.completedSteps),
      QaInputRenderer.attempt(packet),
    ];

    return sections.filter((section) => section !== null).join(SECTION_SEPARATOR);
  }

  private static brief(brief: QaBrief | null): string | null {
    if (brief === null) {
      return null;
    }
    const lines = [
      BRIEF_HEADER,
      ...brief.focus.map((item) => `${BULLET}Verify: ${item}`),
      ...brief.risks.map((item) => `${BULLET}Risk: ${item}`),
    ];
    if (brief.changedInterfaces.length > EMPTY) {
      lines.push(
        `${BULLET}${CHANGED_INTERFACES_LABEL} ${brief.changedInterfaces.join(ENTRY_SEPARATOR)}`,
      );
    }

    return lines.length === HEADER_ONLY ? null : lines.join(LINE_SEPARATOR);
  }

  private static attempt(packet: QaInputPacket): string | null {
    const { attempt, maxAttempts, previousDefects } = packet;
    if (attempt <= FIRST_ATTEMPT && previousDefects.length === EMPTY) {
      return null;
    }
    const header = `Attempt ${attempt} of ${maxAttempts}.`;
    if (previousDefects.length === EMPTY) {
      return header;
    }

    return [
      `${header} ${PREVIOUS_DEFECTS_HEADER}`,
      ...previousDefects.map(QaInputRenderer.defectLine),
    ].join(LINE_SEPARATOR);
  }

  private static defectLine(defect: QaDefect): string {
    const test = defect.testName === undefined ? '' : ` (test: ${defect.testName})`;
    return (
      `${BULLET}[${defect.severity}] ${defect.title}${test}: ` +
      `expected ${defect.expected}, actual ${defect.actual}`
    );
  }
}
