import { DOMINANT_CAUSE_SHARE, MAX_SUMMARY_CHARS } from './failure-diagnosis.constants';
import { FailureSummaryMessages } from './failure-summary.messages';
import type { TestFailureGroup, TestFailureReport } from './test-failure.types';

const LINE_SEPARATOR = '\n';
const NONE = 0;
const SINGLE_GROUP = 1;
const FIRST = 0;
const DROP_LAST = -1;

// The block that is put above the raw output of a failing test run, so the next thing an agent
// reads is how many distinct problems it actually has. Every word of it is computed from the
// recorded output: nothing here asks a model what went wrong.
export class FailureSummaryBuilder {
  static build(report: TestFailureReport): string | null {
    if (report.groups.length === NONE) {
      // Nothing was recognised, so there is nothing to say about the causes. A host problem is
      // still worth a line of its own: no agent can fix it by editing the workspace.
      return FailureSummaryBuilder.hostOnly(report);
    }

    return FailureSummaryBuilder.withinBudget(report, report.groups, NONE);
  }

  // The smallest causes give way first: the summary must stay bounded, and the cause most
  // failures share is the one worth the characters.
  private static withinBudget(
    report: TestFailureReport,
    groups: readonly TestFailureGroup[],
    omitted: number,
  ): string {
    const text = FailureSummaryBuilder.render(report, groups, omitted);
    if (text.length <= MAX_SUMMARY_CHARS || groups.length <= SINGLE_GROUP) {
      return text;
    }

    return FailureSummaryBuilder.withinBudget(
      report,
      groups.slice(FIRST, DROP_LAST),
      omitted + SINGLE_GROUP,
    );
  }

  private static render(
    report: TestFailureReport,
    groups: readonly TestFailureGroup[],
    omitted: number,
  ): string {
    const lines = [
      FailureSummaryMessages.header(),
      FailureSummaryMessages.counts(report.failedCount, report.totalCount, report.groups.length),
      ...groups.flatMap(FailureSummaryBuilder.groupLines),
    ];
    if (omitted > NONE) {
      lines.push(FailureSummaryMessages.groupsOmitted(omitted));
    }
    const verdict = FailureSummaryBuilder.verdict(report);
    if (verdict !== null) {
      lines.push(verdict);
    }
    const host = FailureSummaryBuilder.hostLine(report);
    if (host !== null) {
      lines.push(host);
    }

    return lines.join(LINE_SEPARATOR);
  }

  private static groupLines(group: TestFailureGroup): string[] {
    const lines = [FailureSummaryMessages.group(group.count, group.failureClass, group.signature)];
    if (group.sampleTests.length > NONE) {
      lines.push(FailureSummaryMessages.samples(group.sampleTests));
    }

    return lines;
  }

  // Said only when the numbers support it: one cause behind every failure is a different task
  // from one cause behind some of them, and both are different from many unrelated causes.
  private static verdict(report: TestFailureReport): string | null {
    const largest = report.groups[FIRST];
    if (largest === undefined || report.failedCount === NONE) {
      return null;
    }
    if (report.groups.length === SINGLE_GROUP && largest.count >= report.failedCount) {
      return FailureSummaryMessages.oneCause();
    }

    return largest.count / report.failedCount >= DOMINANT_CAUSE_SHARE
      ? FailureSummaryMessages.dominantCause(largest.count, report.failedCount)
      : null;
  }

  private static hostLine(report: TestFailureReport): string | null {
    const advice = report.hostBlockingAdvice;

    return advice === null ? null : FailureSummaryMessages.hostBlocking(advice);
  }

  private static hostOnly(report: TestFailureReport): string | null {
    const line = FailureSummaryBuilder.hostLine(report);

    return line === null ? null : [FailureSummaryMessages.header(), line].join(LINE_SEPARATOR);
  }
}
