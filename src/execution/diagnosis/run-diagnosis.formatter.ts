import { MAX_DIAGNOSIS_CHARS } from '../../workspace/commands/failures/failure-diagnosis.constants';
import type { TestFailureGroup } from '../../workspace/commands/failures/test-failure.types';
import { RunDiagnosisMessages } from './run-diagnosis.messages';
import type { RunDiagnosis, RunDiagnosisStep, RunDiagnosisStepDraft } from './run-diagnosis.types';

const LINE_SEPARATOR = '\n';
const SECTION_SEPARATOR = '\n\n';
const NONE = 0;
const LAST = -1;

// The one rendering of a diagnosis, used by the run report and by the terminal, so the two can
// never say different things about the same run.
//
// The whole text stays under MAX_DIAGNOSIS_CHARS. When it would not, the lowest-ranked cause is
// dropped first: the cause the fewest failures share is the one worth the fewest characters.
export class RunDiagnosisFormatter {
  static format(diagnosis: RunDiagnosis): string {
    const drafts: RunDiagnosisStepDraft[] = diagnosis.steps.map((step) => ({
      step,
      groups: [...step.groups],
    }));

    for (;;) {
      const text = RunDiagnosisFormatter.render(drafts);
      if (text.length <= MAX_DIAGNOSIS_CHARS || !RunDiagnosisFormatter.dropLowest(drafts)) {
        return text;
      }
    }
  }

  static lines(diagnosis: RunDiagnosis): string[] {
    return RunDiagnosisFormatter.format(diagnosis).split(LINE_SEPARATOR);
  }

  private static render(drafts: readonly RunDiagnosisStepDraft[]): string {
    return drafts
      .map((draft) => RunDiagnosisFormatter.step(draft.step, draft.groups))
      .join(SECTION_SEPARATOR);
  }

  private static step(step: RunDiagnosisStep, groups: readonly TestFailureGroup[]): string {
    const lines = [RunDiagnosisMessages.stepHeader(step.index, step.title, step.failure)];
    if (groups.length > NONE) {
      lines.push(
        RunDiagnosisMessages.causesHeader(step.failedCount, step.totalCount),
        ...groups.map(RunDiagnosisFormatter.cause),
      );
    }
    if (step.repeatedCalls.length > NONE) {
      lines.push(
        RunDiagnosisMessages.repeatedHeader(),
        ...step.repeatedCalls.map(RunDiagnosisMessages.repeatedCall),
      );
    }
    if (step.whatToDo !== null) {
      lines.push(RunDiagnosisMessages.whatToDo(step.whatToDo));
    }

    return lines.join(LINE_SEPARATOR);
  }

  private static cause(group: TestFailureGroup): string {
    return RunDiagnosisMessages.cause(group.count, group.failureClass, group.signature);
  }

  // The smallest cause anywhere in the diagnosis, so what survives the budget is what most
  // failures shared.
  private static dropLowest(drafts: readonly RunDiagnosisStepDraft[]): boolean {
    const candidates = drafts.filter((draft) => draft.groups.length > NONE);
    if (candidates.length === NONE) {
      return false;
    }
    const target = candidates.reduce((lowest, draft) =>
      RunDiagnosisFormatter.smallest(draft) <= RunDiagnosisFormatter.smallest(lowest)
        ? draft
        : lowest,
    );
    target.groups = target.groups.slice(NONE, LAST);

    return true;
  }

  private static smallest(draft: RunDiagnosisStepDraft): number {
    return draft.groups[draft.groups.length + LAST].count;
  }
}
