import { ENVIRONMENT_PATTERNS, HOST_BLOCKING_PATTERNS } from './failure-diagnosis.constants';

// The one line a person can act on, taken from the pattern lists and nowhere else. A cause no
// pattern covers has no advice, and then nothing is written rather than something invented.
export class FailureAdvisor {
  static adviceFor(text: string): string | null {
    return FailureAdvisor.hostAdviceFor(text) ?? FailureAdvisor.environmentAdviceFor(text);
  }

  static hostAdviceFor(text: string): string | null {
    return HOST_BLOCKING_PATTERNS.find((rule) => rule.pattern.test(text))?.advice ?? null;
  }

  private static environmentAdviceFor(text: string): string | null {
    return ENVIRONMENT_PATTERNS.find((rule) => rule.pattern.test(text))?.advice ?? null;
  }
}
