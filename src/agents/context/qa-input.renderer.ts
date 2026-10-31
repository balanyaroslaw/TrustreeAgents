import type { ChangedFile } from '../../workspace/git/changed-file.types';
import { ChangedFileClassifier } from '../qa/changed-file.classifier';
import { ChangedFileKind } from '../qa/changed-file-kind.enum';
import { QA_MAX_LISTED_FILES } from '../qa/qa.constants';
import type { QaDefect } from '../qa/qa-result.types';
import type { DeveloperChange, DeveloperResult } from '../developer/developer-result.types';
import type { QaBrief } from './qa-brief.types';
import {
  BRIEF_HEADER,
  CHANGED_CODE_HEADER,
  CHANGED_INTERFACES_LABEL,
  COMPLETED_STEPS_HEADER,
  CRITERIA_HEADER,
  DEVELOPER_NOTES_HEADER,
  MAX_CHANGE_DESCRIPTION_CHARACTERS,
  MAX_DEVELOPER_SUMMARY_CHARACTERS,
  MAX_LISTED_COMPLETED_STEPS,
  MAX_LISTED_DECISIONS,
  MAX_LISTED_OPEN_ISSUES,
  OTHER_GROUP_HEADER,
  PREVIOUS_DEFECTS_HEADER,
  SOURCE_GROUP_HEADER,
  TEST_GROUP_HEADER,
  TRUNCATION_SUFFIX,
} from './qa-input.constants';
import type { QaInputPacket } from './qa-input.types';
import type { CompletedStepSummary, PlanStepContext } from './step-context.types';

const SECTION_SEPARATOR = '\n\n';
const LINE_SEPARATOR = '\n';
const BULLET = '- ';
const ENTRY_SEPARATOR = '; ';
const NAME_SEPARATOR = ', ';
const FIRST_ITEM = 1;
const FIRST_ATTEMPT = 1;
const EMPTY = 0;

export class QaInputRenderer {
  static render(packet: QaInputPacket): string {
    const sections = [
      QaInputRenderer.step(packet.step),
      QaInputRenderer.criteria(packet.step.acceptanceCriteria),
      QaInputRenderer.changedCode(packet.changedCode),
      QaInputRenderer.developerNotes(packet.developerNotes),
      QaInputRenderer.brief(packet.brief),
      QaInputRenderer.completedSteps(packet.completedSteps),
      QaInputRenderer.attempt(packet),
    ];

    return sections.filter((section) => section !== null).join(SECTION_SEPARATOR);
  }

  private static step(step: PlanStepContext): string {
    const header = `Step ${step.index} of ${step.total}: ${step.title}`;
    return step.description.trim() === ''
      ? header
      : [header, step.description.trim()].join(LINE_SEPARATOR);
  }

  private static criteria(criteria: readonly string[]): string | null {
    if (criteria.length === EMPTY) {
      return null;
    }
    const lines = criteria.map((criterion, index) => `${index + FIRST_ITEM}. ${criterion}`);
    return [CRITERIA_HEADER, ...lines].join(LINE_SEPARATOR);
  }

  private static changedCode(changedCode: readonly ChangedFile[]): string | null {
    if (changedCode.length === EMPTY) {
      return null;
    }
    const grouped = QaInputRenderer.grouped(changedCode);
    const listed = [...grouped.source, ...grouped.test, ...grouped.other].slice(
      EMPTY,
      QA_MAX_LISTED_FILES,
    );
    const shown = new Set(listed);
    const lines = [CHANGED_CODE_HEADER];

    if (grouped.source.some((file) => shown.has(file))) {
      lines.push(SOURCE_GROUP_HEADER);
      lines.push(...QaInputRenderer.fileLines(grouped.source.filter((file) => shown.has(file))));
    }
    if (grouped.test.some((file) => shown.has(file))) {
      lines.push(TEST_GROUP_HEADER);
      lines.push(...QaInputRenderer.fileLines(grouped.test.filter((file) => shown.has(file))));
    }
    const other = grouped.other.filter((file) => shown.has(file));
    if (other.length > EMPTY) {
      lines.push(`${OTHER_GROUP_HEADER} ${other.map((file) => file.path).join(NAME_SEPARATOR)}`);
    }
    const remaining = changedCode.length - listed.length;
    if (remaining > EMPTY) {
      lines.push(`and ${remaining} more`);
    }

    return lines.join(LINE_SEPARATOR);
  }

  private static grouped(changedCode: readonly ChangedFile[]): {
    source: ChangedFile[];
    test: ChangedFile[];
    other: ChangedFile[];
  } {
    return {
      source: QaInputRenderer.ofKind(changedCode, ChangedFileKind.Source),
      test: QaInputRenderer.ofKind(changedCode, ChangedFileKind.Test),
      other: QaInputRenderer.ofKind(changedCode, ChangedFileKind.Other),
    };
  }

  private static ofKind(changedCode: readonly ChangedFile[], kind: ChangedFileKind): ChangedFile[] {
    return changedCode.filter((file) => ChangedFileClassifier.classify(file.path) === kind);
  }

  private static fileLines(files: readonly ChangedFile[]): string[] {
    return files.map(
      (file) => `${BULLET}${file.status} ${file.path} (+${file.added} -${file.removed})`,
    );
  }

  private static developerNotes(notes: DeveloperResult | null): string | null {
    if (notes === null) {
      return null;
    }
    const lines = [
      DEVELOPER_NOTES_HEADER,
      `Status: ${notes.status}`,
      `Summary: ${QaInputRenderer.trimmed(notes.summary, MAX_DEVELOPER_SUMMARY_CHARACTERS)}`,
      ...notes.changes.map(QaInputRenderer.changeLine),
    ];

    const decisions = notes.decisions.slice(EMPTY, MAX_LISTED_DECISIONS);
    if (decisions.length > EMPTY) {
      lines.push(`Decisions: ${decisions.join(ENTRY_SEPARATOR)}`);
    }
    const openIssues = notes.openIssues.slice(EMPTY, MAX_LISTED_OPEN_ISSUES);
    if (openIssues.length > EMPTY) {
      lines.push(`Open issues: ${openIssues.join(ENTRY_SEPARATOR)}`);
    }

    return lines.join(LINE_SEPARATOR);
  }

  private static changeLine(change: DeveloperChange): string {
    const description = QaInputRenderer.trimmed(
      change.description,
      MAX_CHANGE_DESCRIPTION_CHARACTERS,
    );
    return `${BULLET}${change.path} (${change.action}): ${description}`;
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
        `${BULLET}${CHANGED_INTERFACES_LABEL} ` + brief.changedInterfaces.join(ENTRY_SEPARATOR),
      );
    }

    return lines.length === FIRST_ITEM ? null : lines.join(LINE_SEPARATOR);
  }

  private static completedSteps(steps: readonly CompletedStepSummary[]): string | null {
    if (steps.length === EMPTY) {
      return null;
    }
    const lines = steps
      .slice(-MAX_LISTED_COMPLETED_STEPS)
      .map((step) => `${BULLET}Step ${step.index}: ${step.summary}`);

    return [COMPLETED_STEPS_HEADER, ...lines].join(LINE_SEPARATOR);
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

  private static trimmed(text: string, maxCharacters: number): string {
    return text.length <= maxCharacters
      ? text
      : `${text.slice(EMPTY, maxCharacters)}${TRUNCATION_SUFFIX}`;
  }
}
