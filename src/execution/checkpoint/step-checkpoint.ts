import { Inject, Injectable } from '@nestjs/common';
import { stat } from 'node:fs/promises';
import type { RunPlan } from '../../agents/orchestrator/plan/run-plan.types';
import { GitService } from '../../workspace/git/git.service';
import type { GitIdentity } from '../../workspace/git/git.types';
import { AtomicFileWriter } from '../../workspace/io/atomic-file.writer';
import { ENV_EXAMPLE_FILE_NAME } from '../../workspace/workspace.constants';
import { WorkspaceService } from '../../workspace/workspace.service';
import {
  AGENT_GIT_IDENTITY,
  DEFAULT_GITIGNORE_ENTRIES,
  ENV_STAGE_EXCLUDES,
  GITIGNORE_FILE_NAME,
  PLAN_FILE_NAME,
} from '../execution.constants';
import type { StepCommitContext } from '../execution.types';
import { RunIdFormatter } from '../run-id.formatter';
import { CommitMessageBuilder } from './commit-message.builder';

const LINE_SEPARATOR = '\n';

// Owns the git history of a run: one branch, one commit per accepted step, and the base ref every
// agent sees. It only ever adds commits: nothing is pushed and no history is rewritten.
@Injectable()
export class StepCheckpoint {
  constructor(
    @Inject(GitService) private readonly git: GitService,
    @Inject(WorkspaceService) private readonly workspace: WorkspaceService,
  ) {}

  // A folder that is not a repository yet becomes one, with a .gitignore and a first commit, so
  // the run always has a base ref to diff against.
  async prepareRepository(runId: string): Promise<void> {
    if (!(await this.git.isRepository())) {
      await this.git.init();
      // Only a project the executor starts gets a .gitignore: an existing repository keeps its
      // own, and a refused run must leave nothing behind.
      await this.writeGitignore();
    }
    if ((await this.git.headCommit()) === null) {
      await this.commit(CommitMessageBuilder.initial(runId));
    }
  }

  async uncommittedPaths(): Promise<readonly string[]> {
    return (await this.git.statusEntries()).map((entry) => entry.path);
  }

  async createRunBranch(runId: string): Promise<string> {
    const branch = RunIdFormatter.branch(runId);
    await this.git.createBranch(branch);
    return branch;
  }

  // The commit every git_diff and changedFiles call of the step is measured against.
  async beginStep(): Promise<string | null> {
    const commit = await this.git.headCommit();
    this.workspace.setRunBaseRef(commit);
    return commit;
  }

  releaseBaseRef(): void {
    this.workspace.setRunBaseRef(null);
  }

  async commitStep(context: StepCommitContext, summary: string): Promise<string | null> {
    return this.commit(CommitMessageBuilder.step(context, summary));
  }

  // The plan and the report are committed on their own, so a commit of the executor never picks
  // up the work of a step that was not accepted.
  async commitPlan(runId: string, plan: RunPlan): Promise<string | null> {
    return this.commitPath(PLAN_FILE_NAME, CommitMessageBuilder.plan(runId, plan));
  }

  async commitReport(runId: string, reportPath: string): Promise<string | null> {
    return this.commitPath(reportPath, CommitMessageBuilder.report(runId));
  }

  // Returns null when there was nothing to commit, so a step that changed no file is recorded as
  // such instead of producing an empty commit.
  async commit(message: string): Promise<string | null> {
    await this.stage();
    return this.commitStaged(message);
  }

  async commitPath(relativePath: string, message: string): Promise<string | null> {
    await this.git.stagePath(relativePath);
    return this.commitStaged(message);
  }

  private async commitStaged(message: string): Promise<string | null> {
    if (!(await this.git.hasStagedChanges())) {
      return null;
    }
    return this.git.commit(message, await this.identity());
  }

  private async stage(): Promise<void> {
    await this.git.stageAll(ENV_STAGE_EXCLUDES);
    if (await this.exists(ENV_EXAMPLE_FILE_NAME)) {
      await this.git.stagePath(ENV_EXAMPLE_FILE_NAME);
    }
  }

  private async writeGitignore(): Promise<void> {
    if (await this.exists(GITIGNORE_FILE_NAME)) {
      return;
    }
    await AtomicFileWriter.replace(
      await this.workspace.resolveSafe(GITIGNORE_FILE_NAME),
      DEFAULT_GITIGNORE_ENTRIES.join(LINE_SEPARATOR) + LINE_SEPARATOR,
    );
  }

  private async exists(relativePath: string): Promise<boolean> {
    try {
      await stat(await this.workspace.resolveSafe(relativePath));
      return true;
    } catch {
      return false;
    }
  }

  // The identity of the user is used when the workspace has one; otherwise the agent identity is
  // passed for this commit only.
  private async identity(): Promise<GitIdentity | null> {
    return (await this.git.identity()) === null ? AGENT_GIT_IDENTITY : null;
  }
}
