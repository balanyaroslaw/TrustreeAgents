import { Inject, Injectable } from '@nestjs/common';
import { ChangedFileStatus } from '../../workspace/git/changed-file-status.enum';
import type { ChangedFile } from '../../workspace/git/changed-file.types';
import { GitService } from '../../workspace/git/git.service';
import { ChangedFileClassifier } from './changed-file.classifier';
import { ChangedFileKind } from './changed-file-kind.enum';

const LINE_SEPARATOR = '\n';

// The diff of the test files of a step, which the QA report reads to spot skipped tests and to
// check that the tests touch the changed code. An untracked test file has no diff against the
// base ref, so it is read as a new file.
@Injectable()
export class TestFileDiffCollector {
  constructor(@Inject(GitService) private readonly git: GitService) {}

  async collect(baseRef: string, files: readonly ChangedFile[]): Promise<string> {
    const paths = files
      .filter(
        (file) =>
          file.status !== ChangedFileStatus.Deleted &&
          ChangedFileClassifier.classify(file.path) === ChangedFileKind.Test,
      )
      .map((file) => file.path);
    const diffs: string[] = [];

    for (const path of paths) {
      diffs.push(
        (await this.git.isTracked(path))
          ? await this.git.diffFull(baseRef, path)
          : await this.git.newFileDiff(path),
      );
    }

    return diffs.join(LINE_SEPARATOR);
  }
}
