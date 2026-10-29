import { isAbsolute, resolve } from 'node:path';
import { DEFAULT_WORKSPACE_PATH } from './cli.constants';

export class WorkspacePathResolver {
  static toAbsolute(workspace?: string, cwd: string = process.cwd()): string {
    const candidate = workspace?.trim() ? workspace.trim() : DEFAULT_WORKSPACE_PATH;
    return isAbsolute(candidate) ? resolve(candidate) : resolve(cwd, candidate);
  }
}
