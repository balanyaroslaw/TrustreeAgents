import { SEVERE_DEFECT_SEVERITIES } from '../../qa/qa.constants';
import type { QaReport } from '../../qa/qa-report.types';
import type { QaDefect } from '../../qa/qa-result.types';
import type { ReviewReport } from '../../reviewer/review-report.types';
import type { ReviewIssue } from '../../reviewer/review-result.types';
import { BLOCKING_SEVERITIES } from '../../reviewer/reviewer.constants';
import {
  DEFERRED_HEADER,
  QA_DEFECTS_HEADER,
  REVIEW_ISSUES_HEADER,
  REWORK_FOCUS_HEADER,
} from './rework-brief.constants';
import type { ReworkBrief } from './rework-brief.types';
import type { StepDecision } from './step-decision.types';

const SECTION_SEPARATOR = '\n\n';
const LINE_SEPARATOR = '\n';
const BULLET = '- ';
const DETAIL_INDENT = '  ';
const FIRST_ITEM = 1;
const EMPTY = 0;

// The judgement of the Orchestrator comes first, then the findings of QA and the Reviewer exactly
// as they recorded them: facts are copied, never rephrased.
export class ReworkBriefBuilder {
  static build(
    decision: StepDecision,
    qaReport: QaReport,
    reviewReport: ReviewReport,
  ): ReworkBrief {
    return {
      focus: decision.reworkFocus,
      qaDefects: qaReport.result.defects.filter((defect) =>
        SEVERE_DEFECT_SEVERITIES.includes(defect.severity),
      ),
      reviewIssues: reviewReport.result.issues.filter((issue) =>
        BLOCKING_SEVERITIES.includes(issue.severity),
      ),
      deferredIssues: decision.deferredIssues,
    };
  }

  static render(brief: ReworkBrief): string {
    const sections: string[] = [];

    if (brief.focus.length > EMPTY) {
      sections.push(
        [
          REWORK_FOCUS_HEADER,
          ...brief.focus.map((item, index) => `${index + FIRST_ITEM}. ${item}`),
        ].join(LINE_SEPARATOR),
      );
    }
    if (brief.qaDefects.length > EMPTY) {
      sections.push(
        [QA_DEFECTS_HEADER, ...brief.qaDefects.flatMap(ReworkBriefBuilder.defectLines)].join(
          LINE_SEPARATOR,
        ),
      );
    }
    if (brief.reviewIssues.length > EMPTY) {
      sections.push(
        [REVIEW_ISSUES_HEADER, ...brief.reviewIssues.flatMap(ReworkBriefBuilder.issueLines)].join(
          LINE_SEPARATOR,
        ),
      );
    }
    if (brief.deferredIssues.length > EMPTY) {
      sections.push(
        [
          DEFERRED_HEADER,
          ...brief.deferredIssues.map((entry) => `${BULLET}${entry.issue} (${entry.reason})`),
        ].join(LINE_SEPARATOR),
      );
    }

    return sections.join(SECTION_SEPARATOR);
  }

  private static defectLines(defect: QaDefect): string[] {
    const test = defect.testName === undefined ? '' : ` (test: ${defect.testName})`;
    const lines = [
      `${BULLET}[${defect.severity}] ${defect.title}${test}`,
      `${DETAIL_INDENT}expected: ${defect.expected}`,
      `${DETAIL_INDENT}actual: ${defect.actual}`,
    ];
    if (defect.suspectedLocation !== undefined) {
      lines.push(`${DETAIL_INDENT}suspected: ${defect.suspectedLocation}`);
    }
    lines.push(`${DETAIL_INDENT}reproduce: ${defect.reproduction}`);

    return lines;
  }

  private static issueLines(issue: ReviewIssue): string[] {
    const location = issue.line === undefined ? issue.file : `${issue.file}:${String(issue.line)}`;

    return [
      `${BULLET}[${issue.severity}] ${location} ${issue.title}`,
      `${DETAIL_INDENT}problem: ${issue.problem}`,
      `${DETAIL_INDENT}fix: ${issue.suggestedFix}`,
    ];
  }
}
