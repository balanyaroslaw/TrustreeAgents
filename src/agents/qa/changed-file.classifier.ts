import { PathPolicy } from '../../workspace/security/path.policy';
import { QA_WRITE_RULES } from '../../workspace/security/role-write-rules.constants';
import { RoleWritePolicy } from '../../workspace/security/role-write.policy';
import { ChangedFileKind } from './changed-file-kind.enum';
import { GENERATED_DIRECTORIES, SOURCE_FILE_EXTENSIONS } from './qa.constants';

const LAST_SEGMENT_OFFSET = 1;

export class ChangedFileClassifier {
  static classify(relativePath: string): ChangedFileKind {
    if (RoleWritePolicy.matches(QA_WRITE_RULES, relativePath)) {
      return ChangedFileKind.Test;
    }
    return ChangedFileClassifier.isSource(relativePath)
      ? ChangedFileKind.Source
      : ChangedFileKind.Other;
  }

  private static isSource(relativePath: string): boolean {
    const segments = PathPolicy.segments(relativePath).map((segment) => segment.toLowerCase());
    if (segments.length === 0) {
      return false;
    }
    const directories = segments.slice(0, segments.length - LAST_SEGMENT_OFFSET);
    if (directories.some((segment) => GENERATED_DIRECTORIES.includes(segment))) {
      return false;
    }
    const name = segments[segments.length - LAST_SEGMENT_OFFSET];
    return SOURCE_FILE_EXTENSIONS.some((extension) => name.endsWith(extension));
  }
}
