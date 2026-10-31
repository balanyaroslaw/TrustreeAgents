import type { ChangedFile } from '../../workspace/git/changed-file.types';
import type { DeveloperChange, DeveloperResult } from '../developer/developer-result.types';
import { ChangedFileClassifier } from '../qa/changed-file.classifier';
import { ChangedFileKind } from '../qa/changed-file-kind.enum';
import {
  DEVELOPER_NOTES_HEADER,
  MAX_CHANGE_DESCRIPTION_CHARACTERS,
  MAX_DEVELOPER_SUMMARY_CHARACTERS,
  MAX_LISTED_COMPLETED_STEPS,
  MAX_LISTED_DECISIONS,
  MAX_LISTED_OPEN_ISSUES,
  TRUNCATION_SUFFIX,
} from './qa-input.constants';
import { COMPLETED_STEPS_HEADER, CRITERIA_HEADER } from './qa-input.constants';
import type { ChangedCodeLabels } from './input-section.types';
import type { CompletedStepSummary, PlanStepContext } from './step-context.types';

const LINE_SEPARATOR = '\n';
const BULLET = '- ';
const ENTRY_SEPARATOR = '; ';
const NAME_SEPARATOR = ', ';
const FIRST_ITEM = 1;
const EMPTY = 0;

// The sections every agent input packet shares, so each *InputRenderer only composes them.
export class InputSectionRenderer {
  static step(step: PlanStepContext): string {
    const header = `Step ${step.index} of ${step.total}: ${step.title}`;
    return step.description.trim() === ''
      ? header
      : [header, step.description.trim()].join(LINE_SEPARATOR);
  }

  static criteria(criteria: readonly string[]): string | null {
    if (criteria.length === EMPTY) {
      return null;
    }
    const lines = criteria.map((criterion, index) => `${index + FIRST_ITEM}. ${criterion}`);
    return [CRITERIA_HEADER, ...lines].join(LINE_SEPARATOR);
  }

  static changedCode(
    changedCode: readonly ChangedFile[],
    labels: ChangedCodeLabels,
    maxListedFiles: number,
  ): string | null {
    if (changedCode.length === EMPTY) {
      return null;
    }
    const source = InputSectionRenderer.ofKind(changedCode, ChangedFileKind.Source);
    const tests = InputSectionRenderer.ofKind(changedCode, ChangedFileKind.Test);
    const other = InputSectionRenderer.ofKind(changedCode, ChangedFileKind.Other);
    const listed = new Set([...source, ...tests, ...other].slice(EMPTY, maxListedFiles));
    const lines = [labels.header];

    for (const [label, group] of [
      [labels.source, source],
      [labels.tests, tests],
    ] as const) {
      const shown = group.filter((file) => listed.has(file));
      if (shown.length > EMPTY) {
        lines.push(label, ...InputSectionRenderer.fileLines(shown));
      }
    }
    const shownOther = other.filter((file) => listed.has(file));
    if (shownOther.length > EMPTY) {
      lines.push(`${labels.other} ${shownOther.map((file) => file.path).join(NAME_SEPARATOR)}`);
    }
    const remaining = changedCode.length - listed.size;
    if (remaining > EMPTY) {
      lines.push(`and ${remaining} more`);
    }

    return lines.join(LINE_SEPARATOR);
  }

  static developerNotes(notes: DeveloperResult | null): string | null {
    if (notes === null) {
      return null;
    }
    const lines = [
      DEVELOPER_NOTES_HEADER,
      `Status: ${notes.status}`,
      `Summary: ${InputSectionRenderer.trimmed(notes.summary, MAX_DEVELOPER_SUMMARY_CHARACTERS)}`,
      ...notes.changes.map(InputSectionRenderer.changeLine),
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

  static completedSteps(steps: readonly CompletedStepSummary[]): string | null {
    if (steps.length === EMPTY) {
      return null;
    }
    const lines = steps
      .slice(-MAX_LISTED_COMPLETED_STEPS)
      .map((step) => `${BULLET}Step ${step.index}: ${step.summary}`);

    return [COMPLETED_STEPS_HEADER, ...lines].join(LINE_SEPARATOR);
  }

  static trimmed(text: string, maxCharacters: number): string {
    return text.length <= maxCharacters
      ? text
      : `${text.slice(EMPTY, maxCharacters)}${TRUNCATION_SUFFIX}`;
  }

  private static ofKind(changedCode: readonly ChangedFile[], kind: ChangedFileKind): ChangedFile[] {
    return changedCode.filter((file) => ChangedFileClassifier.classify(file.path) === kind);
  }

  private static fileLines(files: readonly ChangedFile[]): string[] {
    return files.map(
      (file) => `${BULLET}${file.status} ${file.path} (+${file.added} -${file.removed})`,
    );
  }

  private static changeLine(change: DeveloperChange): string {
    const description = InputSectionRenderer.trimmed(
      change.description,
      MAX_CHANGE_DESCRIPTION_CHARACTERS,
    );
    return `${BULLET}${change.path} (${change.action}): ${description}`;
  }
}
