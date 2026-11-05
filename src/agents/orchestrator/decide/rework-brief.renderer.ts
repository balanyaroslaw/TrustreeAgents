import {
  DIFF_STAT_HEADER,
  PREVIOUS_ATTEMPTS_HEADER,
  REFERENCED_CODE_HEADER,
} from './rework-brief.constants';
import { ReworkBriefMessages } from './rework-brief.messages';
import type { CodeExcerpt, ReworkBriefExtras, ReworkBriefOmissions } from './rework-brief.types';

const SECTION_SEPARATOR = '\n\n';
const LINE_SEPARATOR = '\n';
const NONE = 0;
const NO_OMISSIONS: ReworkBriefOmissions = {
  attempts: NONE,
  excerpts: NONE,
  failingOutputTrimmed: false,
  failingOutputDropped: false,
};

// The front-loaded sections of the rework brief, in the order the Developer needs them: what it
// changed, what failed, the code it has to change, and what was already tried. Each section is
// omitted when it has no data, and says plainly when the packet budget left something out.
export class ReworkBriefRenderer {
  static render(extras: ReworkBriefExtras): string {
    const omissions = extras.omissions ?? NO_OMISSIONS;
    const sections = [
      ReworkBriefRenderer.previousStop(extras),
      ReworkBriefRenderer.diffStat(extras),
      ReworkBriefRenderer.failingOutput(extras, omissions),
      ReworkBriefRenderer.referencedCode(extras, omissions),
      ReworkBriefRenderer.previousAttempts(extras, omissions),
    ];

    return sections.filter((section) => section !== null).join(SECTION_SEPARATOR);
  }

  // First, because it changes what the attempt should do before it does anything else: the
  // edits of the stopped attempt are in the workspace already.
  private static previousStop(extras: ReworkBriefExtras): string | null {
    const stop = extras.previousStop;
    if (stop === undefined) {
      return null;
    }
    const lines = [
      ReworkBriefMessages.previousStopHeader(stop.reason, stop.toolCalls),
      ...stop.paths.map(ReworkBriefMessages.previousStopPath),
    ];
    if (stop.omittedPaths > NONE) {
      lines.push(ReworkBriefMessages.morePaths(stop.omittedPaths));
    }

    return lines.join(LINE_SEPARATOR);
  }

  private static diffStat(extras: ReworkBriefExtras): string | null {
    const { diffStat } = extras;

    return diffStat === undefined ? null : [DIFF_STAT_HEADER, diffStat].join(LINE_SEPARATOR);
  }

  private static failingOutput(
    extras: ReworkBriefExtras,
    omissions: ReworkBriefOmissions,
  ): string | null {
    const run = extras.failingOutput;
    if (run === undefined) {
      // Said plainly: an absent section would otherwise read as "the suite printed nothing".
      return omissions.failingOutputDropped ? ReworkBriefMessages.failingOutputDropped() : null;
    }
    const lines = [ReworkBriefMessages.failingRunHeader(run.command)];
    if (run.summary !== null) {
      lines.push(run.summary);
    }
    if (omissions.failingOutputTrimmed) {
      lines.push(ReworkBriefMessages.failingOutputTrimmed());
    }
    if (run.outputTail !== '') {
      lines.push(run.outputTail);
    }

    return lines.join(LINE_SEPARATOR);
  }

  private static referencedCode(
    extras: ReworkBriefExtras,
    omissions: ReworkBriefOmissions,
  ): string | null {
    const excerpts = extras.referencedCode;
    if (excerpts === undefined) {
      return null;
    }
    const lines = [REFERENCED_CODE_HEADER, ...excerpts.flatMap(ReworkBriefRenderer.excerptLines)];
    if (omissions.excerpts > NONE) {
      lines.push(ReworkBriefMessages.excerptsOmitted(omissions.excerpts));
    }

    return lines.join(LINE_SEPARATOR);
  }

  private static excerptLines(excerpt: CodeExcerpt): string[] {
    return [
      ReworkBriefMessages.excerptLabel(excerpt.path, excerpt.startLine, excerpt.endLine),
      excerpt.code,
    ];
  }

  private static previousAttempts(
    extras: ReworkBriefExtras,
    omissions: ReworkBriefOmissions,
  ): string | null {
    const attempts = extras.previousAttempts;
    if (attempts === undefined) {
      return null;
    }
    const lines = [PREVIOUS_ATTEMPTS_HEADER];
    if (omissions.attempts > NONE) {
      lines.push(ReworkBriefMessages.attemptsOmitted(omissions.attempts));
    }
    for (const attempt of attempts) {
      lines.push(
        ReworkBriefMessages.previousAttemptLine(attempt.attempt, attempt.focus, attempt.reason),
      );
    }

    return lines.join(LINE_SEPARATOR);
  }
}
