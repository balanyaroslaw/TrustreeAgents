import type { AgentFailureKind } from '../agents/agent-failure.enum';
import type { AgentRepeatedCall } from './run-diagnosis.types';

const SINGLE = 1;

// Every sentence the diagnosis says. They are written here once and read by both places that
// show the diagnosis, so the report and the terminal cannot drift apart.
export class RunDiagnosisMessages {
  static notAccepted(attempts: number): string {
    return `not accepted after ${RunDiagnosisMessages.count(attempts, 'attempt')}`;
  }

  static hostBlocked(): string {
    return 'host blocked: the suite cannot run on this machine as it is';
  }

  static agentStopped(agent: string, failure: AgentFailureKind): string {
    return `${agent} stopped on ${failure}`;
  }

  static budgetExhausted(agent: string): string {
    return `the token budget was exhausted while ${agent} was running`;
  }

  static agentCallFailed(): string {
    return 'an agent call failed, so the step never produced a decision';
  }

  static title(): string {
    return 'Why it failed';
  }

  static stepHeader(index: number, title: string, failure: string): string {
    return `Step ${index} (${title}): ${failure}.`;
  }

  static causesHeader(failedCount: number, totalCount: number | null): string {
    const tests =
      totalCount === null
        ? `${RunDiagnosisMessages.count(failedCount, 'test')} failed`
        : `${failedCount} of ${totalCount} tests failed`;

    return `  ${tests} in the last full-suite run:`;
  }

  static cause(count: number, failureClass: string, signature: string): string {
    return `  - ${count} × ${failureClass}: "${signature}"`;
  }

  static repeatedHeader(): string {
    return '  Repeated calls:';
  }

  static repeatedCall(call: AgentRepeatedCall): string {
    const args = call.arguments === '' ? '' : ` ${call.arguments}`;

    return `  - ${call.agent}: ${call.tool}${args} × ${call.count}`;
  }

  static whatToDo(advice: string): string {
    return `  What to do: ${advice}.`;
  }

  private static count(value: number, noun: string): string {
    return `${value} ${noun}${value === SINGLE ? '' : 's'}`;
  }
}
