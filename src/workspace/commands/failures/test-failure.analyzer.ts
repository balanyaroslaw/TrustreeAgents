import { FailureAdvisor } from './failure.advisor';
import { FailureClassifier } from './failure.classifier';
import {
  MAX_FAILURE_GROUPS,
  MAX_SAMPLE_LINES,
  MAX_SAMPLE_TESTS,
} from './failure-diagnosis.constants';
import { FailureSignatureNormaliser } from './failure-signature.normaliser';
import { GenericFailureParser } from './generic-failure.parser';
import { NodeTestParser } from './node-test.parser';
import type {
  FailureGroupDraft,
  ParsedFailure,
  ParsedFailures,
  TestFailureGroup,
  TestFailureReport,
} from './test-failure.types';

const LINE_SEPARATOR = '\n';
const SUCCESS_EXIT_CODE = 0;
const NONE = 0;
const ONE = 1;
const START = 0;

// Groups the failures of one test run by their cause, so twenty-nine failures of one missing
// setting reach the agents as one problem instead of twenty-nine.
//
// Nothing here classifies anything: the parsers read the output, the normaliser builds the
// signature the failures are grouped by, and FailureClassifier matches the pattern lists. An
// output that cannot be parsed yields a report with no groups; a group is never invented and this
// class never throws.
export class TestFailureAnalyzer {
  static analyze(output: string, exitCode: number | null): TestFailureReport {
    if (exitCode === SUCCESS_EXIT_CODE || output.trim() === '') {
      return TestFailureAnalyzer.empty();
    }
    try {
      return TestFailureAnalyzer.reportOf(output);
    } catch {
      // The analysis is an addition to the output the agent already has: losing it costs a
      // summary, while throwing here would cost the command run that produced it.
      return TestFailureAnalyzer.empty();
    }
  }

  static empty(): TestFailureReport {
    return {
      failedCount: NONE,
      totalCount: null,
      groups: [],
      hostBlocking: false,
      hostBlockingAdvice: null,
    };
  }

  private static reportOf(output: string): TestFailureReport {
    const parsed = TestFailureAnalyzer.parse(output);
    const groups = TestFailureAnalyzer.group(parsed.failures);
    const recognised = groups.reduce((total, group) => total + group.count, NONE);
    // Read from the whole output: a host that cannot run the suite at all says so before any
    // test line is printed, so there is no group to read it from.
    const hostAdvice = FailureAdvisor.hostAdviceFor(output);

    return {
      failedCount: parsed.failedCount ?? recognised,
      totalCount: parsed.totalCount,
      groups: groups.slice(START, MAX_FAILURE_GROUPS),
      hostBlocking: hostAdvice !== null,
      hostBlockingAdvice: hostAdvice,
    };
  }

  // The node --test format first, because that is what the workspaces under test use; the generic
  // parser only runs when it recognised nothing.
  private static parse(output: string): ParsedFailures {
    const node = NodeTestParser.parse(output);
    if (node.failures.length > NONE) {
      return node;
    }
    const generic = GenericFailureParser.parse(output);

    return {
      failures: generic.failures,
      failedCount: node.failedCount ?? generic.failedCount,
      totalCount: node.totalCount ?? generic.totalCount,
    };
  }

  // Largest group first, so the cause most failures share is the one an agent reads.
  private static group(failures: readonly ParsedFailure[]): TestFailureGroup[] {
    const drafts = new Map<string, FailureGroupDraft>();

    for (const failure of failures) {
      const signature = FailureSignatureNormaliser.normalise(failure.errorLine);
      if (signature === '') {
        continue;
      }
      TestFailureAnalyzer.place(drafts, signature, failure);
    }

    return [...drafts.values()]
      .sort((left, right) => right.count - left.count)
      .map(TestFailureAnalyzer.groupOf);
  }

  private static place(
    drafts: Map<string, FailureGroupDraft>,
    signature: string,
    failure: ParsedFailure,
  ): void {
    const known = drafts.get(signature);
    if (known === undefined) {
      drafts.set(signature, {
        signature,
        // The class of the cause as the first failure stated it, matched on the error line itself
        // and not on the signature, which no longer carries the error class.
        failureClass: FailureClassifier.classify(failure.errorLine),
        tests: TestFailureAnalyzer.testsOf(failure),
        count: ONE,
        sampleStack: TestFailureAnalyzer.stackOf(failure),
      });
      return;
    }
    known.count += ONE;
    if (known.tests.length < MAX_SAMPLE_TESTS && failure.test !== null) {
      known.tests.push(failure.test);
    }
    if (known.sampleStack === '') {
      known.sampleStack = TestFailureAnalyzer.stackOf(failure);
    }
  }

  private static groupOf(draft: FailureGroupDraft): TestFailureGroup {
    return {
      signature: draft.signature,
      count: draft.count,
      failureClass: draft.failureClass,
      sampleTests: draft.tests,
      sampleStack: draft.sampleStack,
    };
  }

  private static testsOf(failure: ParsedFailure): string[] {
    return failure.test === null ? [] : [failure.test];
  }

  private static stackOf(failure: ParsedFailure): string {
    return failure.stack.slice(START, MAX_SAMPLE_LINES).join(LINE_SEPARATOR);
  }
}
