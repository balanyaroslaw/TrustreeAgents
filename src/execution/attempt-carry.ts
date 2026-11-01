import type { ReworkBrief } from '../agents/orchestrator/decide/rework-brief.types';
import type { QaDefect } from '../agents/qa/qa-result.types';
import type { ReviewIssue } from '../agents/reviewer/review-result.types';
import type { ChangedFile } from '../workspace/git/changed-file.types';

// What one attempt hands to the next: the rework brief of the Orchestrator, the findings the
// agents should re-check, and what the previous attempt actually changed.
export class AttemptCarry {
  reworkBrief: ReworkBrief | null = null;
  systemNote: string | null = null;
  previousDefects: readonly QaDefect[] = [];
  previousIssues: readonly ReviewIssue[] = [];
  changedCode: readonly ChangedFile[] = [];

  fromDecision(
    brief: ReworkBrief,
    defects: readonly QaDefect[],
    issues: readonly ReviewIssue[],
    changedCode: readonly ChangedFile[],
  ): void {
    this.reworkBrief = brief;
    this.systemNote = null;
    this.previousDefects = defects;
    this.previousIssues = issues;
    this.changedCode = changedCode;
  }

  fromNote(note: string | null, changedCode: readonly ChangedFile[]): void {
    this.reworkBrief = null;
    this.systemNote = note;
    this.previousDefects = [];
    this.previousIssues = [];
    this.changedCode = changedCode;
  }
}
