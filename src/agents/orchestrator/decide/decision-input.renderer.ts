import { InputSectionRenderer } from '../../context/input-section.renderer';
import { DeveloperReportFormatter } from '../../developer/developer-report.formatter';
import { QaReportFormatter } from '../../qa/qa-report.formatter';
import { ReviewReportFormatter } from '../../reviewer/review-report.formatter';
import {
  DEVELOPER_REPORT_HEADER,
  EARLIER_DECISIONS_HEADER,
  FOCUS_LABEL,
  QA_REPORT_HEADER,
  REVIEW_REPORT_HEADER,
} from './decision-input.constants';
import type { DecisionInputPacket, PreviousAttemptDecision } from './decision-input.types';

const SECTION_SEPARATOR = '\n\n';
const LINE_SEPARATOR = '\n';
const BULLET = '- ';
const DETAIL_INDENT = '  ';
const ENTRY_SEPARATOR = '; ';
const EMPTY = 0;

export class DecisionInputRenderer {
  static render(packet: DecisionInputPacket): string {
    const sections = [
      InputSectionRenderer.step(packet.step),
      InputSectionRenderer.criteria(packet.step.acceptanceCriteria),
      `Attempt ${packet.attempt} of ${packet.maxAttempts}.`,
      [DEVELOPER_REPORT_HEADER, DeveloperReportFormatter.format(packet.developerReport)].join(
        LINE_SEPARATOR,
      ),
      [QA_REPORT_HEADER, QaReportFormatter.format(packet.qaReport)].join(LINE_SEPARATOR),
      [REVIEW_REPORT_HEADER, ReviewReportFormatter.format(packet.reviewReport)].join(
        LINE_SEPARATOR,
      ),
      DecisionInputRenderer.previousAttempts(packet.previousAttempts),
    ];

    return sections.filter((section) => section !== null).join(SECTION_SEPARATOR);
  }

  private static previousAttempts(attempts: readonly PreviousAttemptDecision[]): string | null {
    if (attempts.length === EMPTY) {
      return null;
    }
    const lines = attempts.flatMap((attempt) => {
      const entry = [
        `${BULLET}Attempt ${attempt.attempt}: ${attempt.decision} - ${attempt.reason}`,
      ];
      if (attempt.reworkFocus.length > EMPTY) {
        entry.push(`${DETAIL_INDENT}${FOCUS_LABEL} ${attempt.reworkFocus.join(ENTRY_SEPARATOR)}`);
      }
      return entry;
    });

    return [EARLIER_DECISIONS_HEADER, ...lines].join(LINE_SEPARATOR);
  }
}
