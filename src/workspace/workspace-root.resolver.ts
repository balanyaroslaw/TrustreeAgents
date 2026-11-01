import { existsSync, realpathSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import {
  MISSING_WORKSPACE_EXIT_CODE,
  WORKSPACE_ARGUMENT_FLAGS,
  WORKSPACE_ARGUMENT_PREFIX,
} from './workspace.constants';
import { WorkspaceMessages } from './workspace.messages';

const NEXT = 1;

// The workspace the tools work in comes from the command line, because the providers are built
// before a command runs. A path that does not exist stops the process right here, with a message
// that names it, instead of failing later inside a tool.
export class WorkspaceRootResolver {
  static fromArgv(argv: readonly string[], cwd: string = process.cwd()): string {
    const requested = WorkspaceRootResolver.argumentOf(argv);
    if (requested === null) {
      return realpathSync(cwd);
    }
    const absolute = isAbsolute(requested) ? resolve(requested) : resolve(cwd, requested);
    if (!existsSync(absolute)) {
      console.error(WorkspaceMessages.workspaceNotFound(requested));
      process.exit(MISSING_WORKSPACE_EXIT_CODE);
    }

    return realpathSync(absolute);
  }

  private static argumentOf(argv: readonly string[]): string | null {
    for (const [position, argument] of argv.entries()) {
      if (WORKSPACE_ARGUMENT_FLAGS.includes(argument)) {
        return argv[position + NEXT] ?? null;
      }
      for (const prefix of WORKSPACE_ARGUMENT_PREFIX) {
        if (argument.startsWith(prefix)) {
          return argument.slice(prefix.length);
        }
      }
    }
    return null;
  }
}
