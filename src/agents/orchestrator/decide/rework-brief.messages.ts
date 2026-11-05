const EXCERPT_LABEL_PREFIX = '--- ';
const SINGLE_CALL = 1;
const RANGE_SEPARATOR = '-';

// The interpolated lines of the rework brief. Plain headings stay in rework-brief.constants.ts.
export class ReworkBriefMessages {
  static failingRunHeader(command: string): string {
    return `The failing test run (${command}):`;
  }

  static previousStopHeader(reason: string, toolCalls: number): string {
    const calls = toolCalls === SINGLE_CALL ? '1 tool call' : `${String(toolCalls)} tool calls`;

    return `Your previous attempt stopped early (${reason} after ${calls}). It had changed:`;
  }

  static previousStopPath(path: string): string {
    return ` ${path}`;
  }

  static morePaths(count: number): string {
    return ` and ${String(count)} more`;
  }

  static excerptLabel(path: string, startLine: number, endLine: number): string {
    return `${EXCERPT_LABEL_PREFIX}${path}:${String(startLine)}${RANGE_SEPARATOR}${String(endLine)}`;
  }

  static previousAttemptLine(attempt: number, focus: string, reason: string): string {
    return `- attempt ${String(attempt)}: asked to ${focus}; rejected because ${reason}`;
  }

  static moreFiles(count: number): string {
    return `and ${String(count)} more files`;
  }

  static excerptsOmitted(count: number): string {
    return `[${String(count)} further excerpts omitted]`;
  }

  static attemptsOmitted(count: number): string {
    return `[${String(count)} earlier attempts omitted]`;
  }

  static failingOutputTrimmed(): string {
    return '[failing output trimmed to fit the packet budget]';
  }

  static failingOutputDropped(): string {
    return '[the output of the failing test run did not fit the packet budget]';
  }
}
