import { Inject, Injectable } from '@nestjs/common';
import { realpathSync } from 'node:fs';
import { realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { ErrorInspector } from './utils/error.inspector';
import {
  CURRENT_DIRECTORY_SEGMENT,
  EMPTY_PATH_MESSAGE,
  EMPTY_ROOT_MESSAGE,
  NULL_BYTE_PATH_MESSAGE,
  OUTSIDE_WORKSPACE_MESSAGE,
  WORKSPACE_ROOT,
} from './workspace.constants';

const NULL_BYTE = '\0';
const PARENT_SEGMENT = '..';
const POSIX_SEPARATOR = '/';

@Injectable()
export class WorkspaceService {
  private readonly rootPath: string;

  constructor(@Inject(WORKSPACE_ROOT) root: string) {
    if (root.trim() === '') {
      throw new Error(EMPTY_ROOT_MESSAGE);
    }
    this.rootPath = realpathSync(resolve(root));
  }

  get root(): string {
    return this.rootPath;
  }

  toRelative(absolutePath: string): string {
    const rel = relative(this.rootPath, absolutePath);
    return rel === '' ? CURRENT_DIRECTORY_SEGMENT : rel.split(sep).join(POSIX_SEPARATOR);
  }

  async resolveSafe(inputPath: string): Promise<string> {
    if (typeof inputPath !== 'string' || inputPath.trim() === '') {
      throw new Error(EMPTY_PATH_MESSAGE);
    }
    if (inputPath.includes(NULL_BYTE)) {
      throw new Error(NULL_BYTE_PATH_MESSAGE);
    }

    const absolute = resolve(this.rootPath, inputPath);
    this.assertInside(absolute);
    this.assertInside(await this.realpathOfNearestExisting(absolute));

    return absolute;
  }

  private assertInside(absolutePath: string): void {
    const rel = relative(this.rootPath, absolutePath);
    if (rel === '') {
      return;
    }
    if (isAbsolute(rel) || rel === PARENT_SEGMENT || rel.startsWith(`${PARENT_SEGMENT}${sep}`)) {
      throw new Error(OUTSIDE_WORKSPACE_MESSAGE);
    }
  }

  private async realpathOfNearestExisting(absolutePath: string): Promise<string> {
    let current = absolutePath;
    for (;;) {
      try {
        return await realpath(current);
      } catch (error) {
        if (!ErrorInspector.isMissingPath(error)) {
          throw error;
        }
        const parent = dirname(current);
        if (parent === current) {
          return current;
        }
        current = parent;
      }
    }
  }
}
