import { Inject, Injectable } from '@nestjs/common';
import { GitService } from '../../../workspace/git/git.service';
import type { PreviousAttemptDecision } from './decision-input.types';
import { ExcerptPlanner } from './excerpt.planner';
import { FailingRunSelector } from './failing-run.selector';
import { ReferencedCodeReader } from './referenced-code.reader';
import { MAX_DIFF_STAT_LINES, MAX_PREVIOUS_ATTEMPT_CHARACTERS } from './rework-brief.constants';
import { ReworkBriefMessages } from './rework-brief.messages';
import type {
  PreviousAttemptNote,
  ReworkBriefFacts,
  ReworkBriefFactsRequest,
} from './rework-brief.types';

const LINE_SEPARATOR = '\n';
const FOCUS_SEPARATOR = '; ';
const TRUNCATION_MARKER = '…';
const DIFF_STAT_FILE_MARKER = ' | ';
const NO_LINES = 0;

// Gathers the facts the Developer would otherwise spend a tool call each on: the output of the
// run that failed, the code around every blocking issue, what the step has changed so far, and
// what earlier attempts were asked to do. Everything comes from recorders, git and disk; the
// Developer is asked for none of it, and the Developer never reads the recorders itself.
@Injectable()
export class ReworkBriefFactsCollector {
  constructor(
    @Inject(GitService) private readonly git: GitService,
    @Inject(ReferencedCodeReader) private readonly code: ReferencedCodeReader,
  ) {}

  async collect(request: ReworkBriefFactsRequest): Promise<ReworkBriefFacts> {
    return {
      failingOutput: FailingRunSelector.select(
        request.commandRuns,
        request.testScript,
        request.fullSuiteCommand,
      ),
      referencedCode: await this.code.read(ExcerptPlanner.plan(request.blockingIssues)),
      diffStat: await this.diffStat(request.baseRef),
      previousAttempts: request.previousDecisions.map(ReworkBriefFactsCollector.noteOf),
    };
  }

  // A workspace that is not a repository yet, or a base ref that cannot be resolved, simply has
  // no diff stat: the brief loses one section and nothing else.
  private async diffStat(baseRef: string): Promise<string | null> {
    let stat: string;
    try {
      stat = await this.git.diffStat(baseRef);
    } catch {
      return null;
    }
    const trimmed = stat.trimEnd();

    return trimmed === '' ? null : ReworkBriefFactsCollector.clipLines(trimmed);
  }

  private static clipLines(stat: string): string {
    const lines = stat.split(LINE_SEPARATOR);
    if (lines.length <= MAX_DIFF_STAT_LINES) {
      return stat;
    }
    const kept = lines.slice(NO_LINES, MAX_DIFF_STAT_LINES);
    const omittedFiles = lines
      .slice(MAX_DIFF_STAT_LINES)
      .filter((line) => line.includes(DIFF_STAT_FILE_MARKER)).length;

    return [...kept, ReworkBriefMessages.moreFiles(omittedFiles)].join(LINE_SEPARATOR);
  }

  private static noteOf(decision: PreviousAttemptDecision): PreviousAttemptNote {
    return {
      attempt: decision.attempt,
      focus: ReworkBriefFactsCollector.clip(decision.reworkFocus.join(FOCUS_SEPARATOR)),
      reason: ReworkBriefFactsCollector.clip(decision.reason),
    };
  }

  private static clip(text: string): string {
    const trimmed = text.trim();

    return trimmed.length <= MAX_PREVIOUS_ATTEMPT_CHARACTERS
      ? trimmed
      : `${trimmed.slice(NO_LINES, MAX_PREVIOUS_ATTEMPT_CHARACTERS)}${TRUNCATION_MARKER}`;
  }
}
