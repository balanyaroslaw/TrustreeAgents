import type { QaBrief } from '../agents/context/qa-brief.types';
import type { DeveloperReport } from '../agents/developer/developer-report.types';
import type { GuardedDecision } from '../agents/orchestrator/decide/decision-outcome.types';
import type { QaReport } from '../agents/qa/qa-report.types';
import type { ReviewReport } from '../agents/reviewer/review-report.types';
import type { ChangedFile } from '../workspace/git/changed-file.types';
import type { AttemptOutcome } from './execution.types';

// What one attempt of one step collects while it runs. It is handed to the report builders and
// then stored; the runner keeps no other state about an attempt.
export class AttemptState {
  developerReport: DeveloperReport | null = null;
  qaReport: QaReport | null = null;
  reviewReport: ReviewReport | null = null;
  guarded: GuardedDecision | null = null;
  brief: QaBrief | null = null;
  // What the Developer changed, and the same list after QA added its tests: the Reviewer reviews
  // the tests as code, so it sees both.
  changedCode: readonly ChangedFile[] = [];
  reviewScope: readonly ChangedFile[] = [];
  note: string | null = null;
  verificationSkipped = false;

  constructor(
    readonly attempt: number,
    private readonly startedAt: number,
    private readonly tokensBefore: number,
  ) {}

  // Ends the attempt without QA, the Reviewer and a decision: there is nothing to verify, and the
  // note says what the code observed.
  skipVerification(note: string): void {
    this.note = note;
    this.verificationSkipped = true;
  }

  outcome(tokensNow: number): AttemptOutcome {
    return {
      attempt: this.attempt,
      developerReport: this.developerReport,
      qaReport: this.qaReport,
      reviewReport: this.reviewReport,
      guarded: this.guarded,
      note: this.note,
      tokens: tokensNow - this.tokensBefore,
      durationMs: Date.now() - this.startedAt,
    };
  }
}
