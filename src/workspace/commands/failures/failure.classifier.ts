import {
  ASSERTION_PATTERNS,
  ENVIRONMENT_PATTERNS,
  HOST_BLOCKING_PATTERNS,
} from './failure-diagnosis.constants';
import { FailureClass } from './failure-class.enum';

// Decides what kind of failure an error line states by matching the pattern lists in
// failure-diagnosis.constants.ts, in that order. There is no judgement here and none in the
// analyzer: a cause this file does not recognise is Unknown, which is reported as Unknown.
//
// Environment is checked before Assertion because a missing database prints "expected" too.
export class FailureClassifier {
  static classify(errorLine: string): FailureClass {
    if (FailureClassifier.isEnvironment(errorLine)) {
      return FailureClass.Environment;
    }
    if (ASSERTION_PATTERNS.some((pattern) => pattern.test(errorLine))) {
      return FailureClass.Assertion;
    }

    return FailureClass.Unknown;
  }

  private static isEnvironment(errorLine: string): boolean {
    return (
      ENVIRONMENT_PATTERNS.some((rule) => rule.pattern.test(errorLine)) ||
      HOST_BLOCKING_PATTERNS.some((rule) => rule.pattern.test(errorLine))
    );
  }
}
