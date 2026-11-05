import {
  ERROR_CLASS_PREFIX_PATTERN,
  MAX_SIGNATURE_CHARACTERS,
  SIGNATURE_NOISE_PATTERNS,
} from './failure-diagnosis.constants';

const START = 0;

// Turns one error line into the cause it states, with everything that differs between two
// failures of that cause removed: the error class it was thrown as, durations, ids, paths and
// numbers. Two failures with the same signature are one problem, whatever test they came from.
export class FailureSignatureNormaliser {
  static normalise(errorLine: string): string {
    const withoutClass = errorLine.trim().replace(ERROR_CLASS_PREFIX_PATTERN, '');
    const cleaned = SIGNATURE_NOISE_PATTERNS.reduce(
      (text, rule) => text.replace(rule.pattern, rule.replacement),
      withoutClass,
    ).trim();

    return cleaned.length <= MAX_SIGNATURE_CHARACTERS
      ? cleaned
      : cleaned.slice(START, MAX_SIGNATURE_CHARACTERS);
  }
}
