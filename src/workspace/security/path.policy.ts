import type { WriteTarget } from './write-target.types';
import { WorkspaceMessages } from '../workspace.messages';
import {
  CURRENT_DIRECTORY_SEGMENT,
  ENV_EXAMPLE_FILE_NAME,
  ENV_FILE_NAME,
  ENV_FILE_PREFIX,
  ENV_READ_DENIED_MESSAGE,
  ENV_WRITE_DENIED_MESSAGE,
  GIT_DIRECTORY_NAME,
  GIT_PROTECTED_MESSAGE,
  NODE_MODULES_DIRECTORY_NAME,
  NODE_MODULES_WRITE_DENIED_MESSAGE,
  SKIPPED_NAMES,
} from '../workspace.constants';

const SEGMENT_SPLIT_PATTERN = /[\\/]+/;

export class PathPolicy {
  private static readonly skipped = new Set(SKIPPED_NAMES);

  static segments(relativePath: string): string[] {
    return relativePath
      .split(SEGMENT_SPLIT_PATTERN)
      .filter((segment) => segment !== '' && segment !== CURRENT_DIRECTORY_SEGMENT);
  }

  static isGitPath(relativePath: string): boolean {
    return PathPolicy.segments(relativePath).some(
      (segment) => segment.toLowerCase() === GIT_DIRECTORY_NAME,
    );
  }

  static isNodeModulesPath(relativePath: string): boolean {
    return PathPolicy.segments(relativePath).some(
      (segment) => segment.toLowerCase() === NODE_MODULES_DIRECTORY_NAME,
    );
  }

  static isSecretEnvPath(relativePath: string): boolean {
    return PathPolicy.segments(relativePath).some((segment) => {
      const name = segment.toLowerCase();
      if (name === ENV_EXAMPLE_FILE_NAME) {
        return false;
      }
      return name === ENV_FILE_NAME || name.startsWith(ENV_FILE_PREFIX);
    });
  }

  static isSkippedName(name: string): boolean {
    return PathPolicy.skipped.has(name.toLowerCase());
  }

  static denyReadReason(relativePath: string): string | null {
    if (PathPolicy.isGitPath(relativePath)) {
      return GIT_PROTECTED_MESSAGE;
    }
    if (PathPolicy.isSecretEnvPath(relativePath)) {
      return ENV_READ_DENIED_MESSAGE;
    }
    return null;
  }

  static denyWriteReason(relativePath: string): string | null {
    if (PathPolicy.isGitPath(relativePath)) {
      return GIT_PROTECTED_MESSAGE;
    }
    if (PathPolicy.isSecretEnvPath(relativePath)) {
      return ENV_WRITE_DENIED_MESSAGE;
    }
    if (PathPolicy.isNodeModulesPath(relativePath)) {
      return NODE_MODULES_WRITE_DENIED_MESSAGE;
    }
    return null;
  }

  static denyWriteTargetReason(relativePath: string, target: WriteTarget | null): string | null {
    if (target === null) {
      return null;
    }
    if (target.isSymbolicLink) {
      return WorkspaceMessages.symlinkTarget(relativePath);
    }
    if (target.isDirectory) {
      return WorkspaceMessages.existingDirectoryTarget(relativePath);
    }
    if (!target.isFile) {
      return WorkspaceMessages.notRegularFileTarget(relativePath);
    }
    return null;
  }
}
