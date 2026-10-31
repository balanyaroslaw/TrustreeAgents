import { QaReportFormatter } from '../qa/qa-report.formatter';
import { CHECKLIST_QUESTIONS } from '../reviewer/review-checklist.constants';
import type { ReviewIssue } from '../reviewer/review-result.types';
import { REVIEWER_MAX_LISTED_FILES } from '../reviewer/reviewer.constants';
import { InputSectionRenderer } from './input-section.renderer';
import { DEVELOPER_NOTES_HEADER } from './qa-input.constants';
import {
  CHECKLIST_HEADER,
  PREVIOUS_ISSUES_HEADER,
  QA_DEFECTS_HEADER,
  QA_FACTS_HEADER,
  REVIEW_CHANGED_CODE_LABELS,
} from './review-input.constants';
import type { QaFactsForReview, ReviewInputPacket } from './review-input.types';

const SECTION_SEPARATOR = '\n\n';
const LINE_SEPARATOR = '\n';
const BULLET = '- ';
const ENTRY_SEPARATOR = '; ';
const FIRST_ITEM = 1;
const FIRST_ATTEMPT = 1;
const EMPTY = 0;

export class ReviewInputRenderer {
  static render(packet: ReviewInputPacket): string {
    const sections = [
      InputSectionRenderer.step(packet.step),
      InputSectionRenderer.criteria(packet.step.acceptanceCriteria),
      InputSectionRenderer.changedCode(
        packet.changedCode,
        REVIEW_CHANGED_CODE_LABELS,
        REVIEWER_MAX_LISTED_FILES,
      ),
      InputSectionRenderer.developerNotes(packet.developerNotes, DEVELOPER_NOTES_HEADER),
      ReviewInputRenderer.qaFacts(packet.qaFacts),
      InputSectionRenderer.completedSteps(packet.completedSteps),
      ReviewInputRenderer.attempt(packet),
      // The checklist questions live here and nowhere else, so they reach the model exactly once
      // and the rendered instructions stay within their size target.
      ReviewInputRenderer.checklist(),
    ];

    return sections.filter((section) => section !== null).join(SECTION_SEPARATOR);
  }

  private static qaFacts(facts: QaFactsForReview | null): string | null {
    if (facts === null) {
      return null;
    }
    const lines = [QA_FACTS_HEADER, `Status: ${facts.status}`];

    if (facts.lastFullRun !== null) {
      lines.push(`Last full run: ${QaReportFormatter.fullRun(facts.lastFullRun)}`);
    }
    if (facts.coverageSummary !== '') {
      lines.push(`Coverage: ${facts.coverageSummary}`);
    }
    if (facts.defects.length > EMPTY) {
      lines.push(QA_DEFECTS_HEADER);
      lines.push(
        ...facts.defects.map(
          (defect) =>
            `${BULLET}[${defect.severity}] ${defect.title}` +
            `${defect.testName === undefined ? '' : ` (test: ${defect.testName})`}`,
        ),
      );
    }
    if (facts.testFiles.length > EMPTY) {
      lines.push(
        `Test files: ${facts.testFiles
          .map((file) => `${file.path} - ${file.description}`)
          .join(ENTRY_SEPARATOR)}`,
      );
    }
    if (facts.warnings.length > EMPTY) {
      lines.push(`QA warnings: ${facts.warnings.join(ENTRY_SEPARATOR)}`);
    }

    return lines.join(LINE_SEPARATOR);
  }

  private static attempt(packet: ReviewInputPacket): string | null {
    const { attempt, maxAttempts, previousIssues } = packet;
    if (attempt <= FIRST_ATTEMPT) {
      return null;
    }
    const header = `Attempt ${attempt} of ${maxAttempts}.`;
    if (previousIssues.length === EMPTY) {
      return header;
    }

    return [
      `${header} ${PREVIOUS_ISSUES_HEADER}`,
      ...previousIssues.map(ReviewInputRenderer.issueLine),
    ].join(LINE_SEPARATOR);
  }

  private static issueLine(issue: ReviewIssue): string {
    const location = issue.line === undefined ? issue.file : `${issue.file}:${String(issue.line)}`;
    return `${BULLET}[${issue.severity}] ${issue.title} (${location})`;
  }

  private static checklist(): string {
    const questions = Object.entries(CHECKLIST_QUESTIONS).map(
      ([item, question], index) => `${index + FIRST_ITEM}. ${item}: ${question}`,
    );

    return [CHECKLIST_HEADER, ...questions].join(LINE_SEPARATOR);
  }
}
