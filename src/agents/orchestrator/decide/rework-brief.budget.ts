import { FailingRunSelector } from './failing-run.selector';
import { MAX_REWORK_BRIEF_CHARACTERS } from './rework-brief.constants';
import { ReworkBriefRenderer } from './rework-brief.renderer';
import type { ReworkBriefDraft, ReworkBriefExtras, ReworkBriefFacts } from './rework-brief.types';

const SECTION_SEPARATOR_LENGTH = 2;
const NONE = 0;
const KEEP_LAST_ATTEMPT = 1;
const MIN_SHRINK_CHARACTERS = 1;
const SINGLE_ITEM = 1;

// Keeps the whole packet bounded. The issue list of the brief is never dropped: it is the reason
// the attempt exists. Everything front-loaded is an optimisation, so it gives way in the order
// that costs the Developer least: older attempt notes first, then the excerpts of the least
// severe issues, then the oldest part of the failing output.
//
// When the issue list alone exceeds the budget, the extras are dropped entirely and the brief is
// still rendered: losing the findings would be worse than a long packet.
export class ReworkBriefBudget {
  static fit(coreLength: number, facts: ReworkBriefFacts): ReworkBriefExtras {
    const draft: ReworkBriefDraft = {
      diffStat: facts.diffStat,
      failingOutput: facts.failingOutput,
      referencedCode: [...facts.referencedCode],
      previousAttempts: [...facts.previousAttempts],
      droppedAttempts: NONE,
      droppedExcerpts: NONE,
      failingOutputTrimmed: false,
      failingOutputDropped: false,
    };

    ReworkBriefBudget.dropOlderAttempts(coreLength, draft);
    ReworkBriefBudget.dropLeastSevereExcerpts(coreLength, draft);
    ReworkBriefBudget.shrinkFailingOutput(coreLength, draft);

    return ReworkBriefBudget.assemble(draft);
  }

  private static dropOlderAttempts(coreLength: number, draft: ReworkBriefDraft): void {
    if (
      ReworkBriefBudget.fits(coreLength, draft) ||
      draft.previousAttempts.length <= KEEP_LAST_ATTEMPT
    ) {
      return;
    }
    draft.droppedAttempts = draft.previousAttempts.length - KEEP_LAST_ATTEMPT;
    draft.previousAttempts = draft.previousAttempts.slice(-KEEP_LAST_ATTEMPT);
  }

  // The excerpts are ordered most severe first, so the end of the list is the cheapest to lose.
  private static dropLeastSevereExcerpts(coreLength: number, draft: ReworkBriefDraft): void {
    while (!ReworkBriefBudget.fits(coreLength, draft) && draft.referencedCode.length > NONE) {
      draft.referencedCode.pop();
      draft.droppedExcerpts += SINGLE_ITEM;
    }
  }

  private static shrinkFailingOutput(coreLength: number, draft: ReworkBriefDraft): void {
    while (draft.failingOutput !== null && !ReworkBriefBudget.fits(coreLength, draft)) {
      const { command, outputTail } = draft.failingOutput;
      const over = ReworkBriefBudget.length(coreLength, draft) - MAX_REWORK_BRIEF_CHARACTERS;
      const keep = outputTail.length - Math.max(over, MIN_SHRINK_CHARACTERS);
      if (keep <= NONE) {
        draft.failingOutput = null;
        draft.failingOutputTrimmed = false;
        draft.failingOutputDropped = true;
        return;
      }
      draft.failingOutput = { command, outputTail: FailingRunSelector.tail(outputTail, keep) };
      draft.failingOutputTrimmed = true;
    }
  }

  private static fits(coreLength: number, draft: ReworkBriefDraft): boolean {
    return ReworkBriefBudget.length(coreLength, draft) <= MAX_REWORK_BRIEF_CHARACTERS;
  }

  private static length(coreLength: number, draft: ReworkBriefDraft): number {
    const rendered = ReworkBriefRenderer.render(ReworkBriefBudget.assemble(draft));
    if (rendered === '') {
      return coreLength;
    }

    return coreLength + SECTION_SEPARATOR_LENGTH + rendered.length;
  }

  private static droppedNothing(draft: ReworkBriefDraft): boolean {
    return (
      draft.droppedAttempts === NONE &&
      draft.droppedExcerpts === NONE &&
      !draft.failingOutputTrimmed &&
      !draft.failingOutputDropped
    );
  }

  private static assemble(draft: ReworkBriefDraft): ReworkBriefExtras {
    return {
      ...(draft.diffStat === null ? {} : { diffStat: draft.diffStat }),
      ...(draft.failingOutput === null ? {} : { failingOutput: draft.failingOutput }),
      ...(draft.referencedCode.length === NONE ? {} : { referencedCode: draft.referencedCode }),
      ...(draft.previousAttempts.length === NONE
        ? {}
        : { previousAttempts: draft.previousAttempts }),
      ...(ReworkBriefBudget.droppedNothing(draft)
        ? {}
        : {
            omissions: {
              attempts: draft.droppedAttempts,
              excerpts: draft.droppedExcerpts,
              failingOutputTrimmed: draft.failingOutputTrimmed,
              failingOutputDropped: draft.failingOutputDropped,
            },
          }),
    };
  }
}
