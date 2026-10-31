import { SEVERE_DEFECT_SEVERITIES } from '../../qa/qa.constants';
import type { QaReport } from '../../qa/qa-report.types';
import { QaStatus } from '../../qa/qa-status.enum';
import type { ReviewReport } from '../../reviewer/review-report.types';
import { ReviewVerdict } from '../../reviewer/review-verdict.enum';
import { DecisionMessages } from './decision.messages';
import type { GuardedDecision } from './decision-outcome.types';
import { StepDecisionKind } from './step-decision.enum';
import type { StepDecision } from './step-decision.types';

const EMPTY = 0;

// The decision of the model is advisory: these rules keep it from contradicting the facts the
// system recorded. Every override is returned with its reasons, never applied silently.
export class DecisionGuard {
  static apply(
    decision: StepDecision,
    qaReport: QaReport,
    reviewReport: ReviewReport,
    attempt: number,
    maxAttempts: number,
  ): GuardedDecision {
    const blockingFacts = DecisionGuard.blockingFacts(qaReport, reviewReport);
    const overrideReasons: string[] = [];
    let effective = decision.decision;

    if (effective === StepDecisionKind.Accept && blockingFacts.length > EMPTY) {
      effective = StepDecisionKind.Rework;
      overrideReasons.push(...blockingFacts, DecisionMessages.acceptNotAllowed());
    }
    if (
      effective === StepDecisionKind.Rework &&
      decision.reworkFocus.length === EMPTY &&
      blockingFacts.length === EMPTY
    ) {
      effective = StepDecisionKind.Abort;
      overrideReasons.push(DecisionMessages.nothingToRework());
    }
    if (effective !== StepDecisionKind.Accept && attempt >= maxAttempts) {
      effective = StepDecisionKind.Abort;
      overrideReasons.push(DecisionMessages.attemptsExhausted(attempt, maxAttempts));
    }

    return {
      effective,
      original: decision.decision,
      overridden: effective !== decision.decision,
      overrideReasons,
      decision,
    };
  }

  private static blockingFacts(qaReport: QaReport, reviewReport: ReviewReport): string[] {
    const facts: string[] = [];

    if (qaReport.status !== QaStatus.Passed) {
      facts.push(DecisionMessages.qaDidNotPass(qaReport.status));
    }
    if (reviewReport.verdict === ReviewVerdict.ChangesRequested) {
      facts.push(DecisionMessages.reviewRequestsChanges());
    }
    const unmet = reviewReport.result.criteriaAssessment
      .filter((assessment) => !assessment.met)
      .map((assessment) => assessment.criterion);
    if (unmet.length > EMPTY) {
      facts.push(DecisionMessages.criteriaNotMet(unmet));
    }
    const blockingDefects = qaReport.result.defects.filter((defect) =>
      SEVERE_DEFECT_SEVERITIES.includes(defect.severity),
    );
    if (blockingDefects.length > EMPTY) {
      facts.push(DecisionMessages.blockingDefects(blockingDefects.length));
    }

    return facts;
  }
}
