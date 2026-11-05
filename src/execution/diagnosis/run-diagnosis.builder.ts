import { FailureAdvisor } from '../../workspace/commands/failures/failure.advisor';
import { FailureClass } from '../../workspace/commands/failures/failure-class.enum';
import { MAX_DIAGNOSIS_GROUPS } from '../../workspace/commands/failures/failure-diagnosis.constants';
import type { TestFailureReport } from '../../workspace/commands/failures/test-failure.types';
import type { AgentCallLedger } from '../agents/agent-call.ledger';
import { AgentFailureKind } from '../agents/agent-failure.enum';
import type { AgentCallRecord, AttemptOutcome, StepOutcome } from '../execution.types';
import { CUT_OFF_FAILURES } from '../report/run-report.constants';
import { StepStatus } from '../step-status.enum';
import { RunDiagnosisMessages } from './run-diagnosis.messages';
import { RunFailureKind } from './run-failure-kind.enum';
import type { AgentRepeatedCall, RunDiagnosis, RunDiagnosisStep } from './run-diagnosis.types';

const NONE = 0;
const START = 0;
const LAST = -1;

// Says why a run that did not complete did not complete, step by step, from what the run
// recorded: the agent call ledger, the grouped causes of the last failing full-suite run and the
// calls an agent repeated with identical arguments. No model is asked anything here, and nothing
// is inferred that was not recorded.
export class RunDiagnosisBuilder {
  static build(steps: readonly StepOutcome[], ledger: AgentCallLedger): RunDiagnosis | null {
    const diagnosed = steps
      .filter((step) => step.status === StepStatus.Failed)
      .map((step) => RunDiagnosisBuilder.step(step, ledger));

    return diagnosed.length === NONE ? null : { steps: diagnosed };
  }

  private static step(step: StepOutcome, ledger: AgentCallLedger): RunDiagnosisStep {
    const last = RunDiagnosisBuilder.lastAttempt(step.attempts);
    const report = last?.failureReport ?? null;
    const calls = ledger.ofStep(step.index);
    const cutOff = RunDiagnosisBuilder.cutOffCall(calls);
    const kind = RunDiagnosisBuilder.kindOf(step, report, cutOff);

    return {
      index: step.index,
      title: step.title,
      kind,
      failure: RunDiagnosisBuilder.failureOf(kind, step, cutOff),
      failedCount: report?.failedCount ?? NONE,
      totalCount: report?.totalCount ?? null,
      groups: report?.groups.slice(START, MAX_DIAGNOSIS_GROUPS) ?? [],
      repeatedCalls: RunDiagnosisBuilder.repeatedCalls(calls),
      whatToDo: RunDiagnosisBuilder.whatToDo(report),
    };
  }

  // Decided from the facts, in the order that matters to a person: a machine that cannot run the
  // suite comes before a call that ran out of turns, which comes before a step that simply was
  // not accepted. A step with no attempt at all never reached a decision.
  private static kindOf(
    step: StepOutcome,
    report: TestFailureReport | null,
    cutOff: AgentCallRecord | null,
  ): RunFailureKind {
    if (report?.hostBlocking === true) {
      return RunFailureKind.HostBlocked;
    }
    if (cutOff?.failure === AgentFailureKind.MaxTurns) {
      return RunFailureKind.AgentStopped;
    }
    if (cutOff?.failure === AgentFailureKind.BudgetExceeded) {
      return RunFailureKind.BudgetExhausted;
    }

    return step.attempts.length === NONE
      ? RunFailureKind.AgentCallFailed
      : RunFailureKind.NotAccepted;
  }

  private static failureOf(
    kind: RunFailureKind,
    step: StepOutcome,
    cutOff: AgentCallRecord | null,
  ): string {
    if (kind === RunFailureKind.HostBlocked) {
      return RunDiagnosisMessages.hostBlocked();
    }
    if (kind === RunFailureKind.AgentStopped && cutOff !== null) {
      return RunDiagnosisMessages.agentStopped(
        RunDiagnosisBuilder.agentOf(cutOff),
        AgentFailureKind.MaxTurns,
      );
    }
    if (kind === RunFailureKind.BudgetExhausted && cutOff !== null) {
      return RunDiagnosisMessages.budgetExhausted(RunDiagnosisBuilder.agentOf(cutOff));
    }
    if (kind === RunFailureKind.AgentCallFailed) {
      return RunDiagnosisMessages.agentCallFailed();
    }

    return RunDiagnosisMessages.notAccepted(step.attempts.length);
  }

  // The last call of the step the code stopped rather than the agent: that is the one whose
  // reason explains the step.
  private static cutOffCall(calls: readonly AgentCallRecord[]): AgentCallRecord | null {
    const cutOff = calls.filter(
      (call) => call.failure !== null && CUT_OFF_FAILURES.includes(call.failure),
    );

    return cutOff.length === NONE ? null : cutOff[cutOff.length + LAST];
  }

  private static repeatedCalls(calls: readonly AgentCallRecord[]): AgentRepeatedCall[] {
    return calls
      .flatMap((call) =>
        call.repeatedCalls.map((repeated) => ({
          agent: RunDiagnosisBuilder.agentOf(call),
          ...repeated,
        })),
      )
      .sort((left, right) => right.count - left.count);
  }

  // The advice of the first cause the pattern lists cover: a host problem names what to remove,
  // an environment cause names what to set. A cause neither list covers has no advice, and then
  // nothing is written rather than something invented.
  private static whatToDo(report: TestFailureReport | null): string | null {
    if (report === null) {
      return null;
    }
    if (report.hostBlockingAdvice !== null) {
      return report.hostBlockingAdvice;
    }
    for (const group of report.groups) {
      if (group.failureClass !== FailureClass.Environment) {
        continue;
      }
      const advice = FailureAdvisor.adviceFor(group.signature);
      if (advice !== null) {
        return advice;
      }
    }

    return null;
  }

  private static agentOf(call: AgentCallRecord): string {
    return call.task === null ? call.role : `${call.role} (${call.task})`;
  }

  private static lastAttempt(attempts: readonly AttemptOutcome[]): AttemptOutcome | null {
    return attempts.length === NONE ? null : attempts[attempts.length + LAST];
  }
}
