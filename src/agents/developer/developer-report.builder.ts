import { ChangeAction } from './change-action.enum';
import type {
  AgentRunUsage,
  DeveloperDiscrepancies,
  DeveloperMetrics,
  DeveloperReport,
  TrackedChange,
} from './developer-report.types';
import type { DeveloperResult } from './developer-result.types';

export class DeveloperReportBuilder {
  static build(
    result: DeveloperResult,
    trackedChanges: readonly TrackedChange[],
    usage: AgentRunUsage,
    toolCalls: number,
    durationMs: number,
  ): DeveloperReport {
    return {
      result,
      metrics: DeveloperReportBuilder.metrics(trackedChanges, usage, toolCalls, durationMs),
      discrepancies: DeveloperReportBuilder.discrepancies(result, trackedChanges),
    };
  }

  private static metrics(
    trackedChanges: readonly TrackedChange[],
    usage: AgentRunUsage,
    toolCalls: number,
    durationMs: number,
  ): DeveloperMetrics {
    return {
      filesChanged: trackedChanges.length,
      filesCreated: DeveloperReportBuilder.countOf(trackedChanges, ChangeAction.Created),
      filesModified: DeveloperReportBuilder.countOf(trackedChanges, ChangeAction.Modified),
      filesDeleted: DeveloperReportBuilder.countOf(trackedChanges, ChangeAction.Deleted),
      tokens: {
        input: usage.input,
        cachedInput: usage.cachedInput,
        output: usage.output,
        total: usage.input + usage.output,
      },
      toolCalls,
      durationMs,
    };
  }

  private static discrepancies(
    result: DeveloperResult,
    trackedChanges: readonly TrackedChange[],
  ): DeveloperDiscrepancies {
    const trackedPaths = new Set(trackedChanges.map((change) => change.path));
    const reportedPaths = new Set(result.changes.map((change) => change.path));

    return {
      unreportedChanges: DeveloperReportBuilder.missingFrom(trackedPaths, reportedPaths),
      claimedButNotChanged: DeveloperReportBuilder.missingFrom(reportedPaths, trackedPaths),
    };
  }

  private static missingFrom(paths: ReadonlySet<string>, known: ReadonlySet<string>): string[] {
    return [...paths].filter((path) => !known.has(path)).sort();
  }

  private static countOf(trackedChanges: readonly TrackedChange[], action: ChangeAction): number {
    return trackedChanges.filter((change) => change.action === action).length;
  }
}
