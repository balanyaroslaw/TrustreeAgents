import { Injectable } from '@nestjs/common';
import { stat } from 'node:fs/promises';
import { CommandPolicy } from '../../commands/command.policy';
import { CommandRisk } from '../../commands/command-risk.enum';
import { CommandTokenizer } from '../../commands/command.tokenizer';
import { ToolValidationError } from '../../errors/tool-validation.error';
import { PathPolicy } from '../../security/path.policy';
import { ErrorInspector } from '../../utils/error.inspector';
import { GIT_PROTECTED_MESSAGE } from '../../workspace.constants';
import { WorkspaceMessages } from '../../workspace.messages';
import { WorkspaceService } from '../../workspace.service';
import { DEFAULT_COMMAND_TIMEOUT_SECONDS } from '../file-tool.constants';
import { runCommandSchema } from './run-command.schema';
import type { ValidatedCommandRequest } from './run-command.types';

const MILLISECONDS_PER_SECOND = 1_000;
const WINDOWS_PLATFORM = 'win32';
const ARGUMENT_SEPARATOR = ' ';

@Injectable()
export class RunCommandValidator {
  constructor(private readonly workspace: WorkspaceService) {}

  async validate(input: unknown): Promise<ValidatedCommandRequest> {
    if (process.platform === WINDOWS_PLATFORM) {
      throw new ToolValidationError(WorkspaceMessages.commandsNotSupportedOnWindows());
    }

    const parsed = runCommandSchema.safeParse(input);
    if (!parsed.success) {
      throw new ToolValidationError(
        WorkspaceMessages.invalidArguments(parsed.error.issues.map((issue) => issue.message)),
      );
    }
    const {
      command,
      timeoutSeconds = DEFAULT_COMMAND_TIMEOUT_SECONDS,
      cwd: inputCwd,
    } = parsed.data;

    const [executable, ...args] = CommandTokenizer.tokenize(command);
    const classification = await CommandPolicy.classify([executable, ...args], this.workspace);
    if (classification.risk === CommandRisk.Denied) {
      throw new ToolValidationError(
        classification.reason ?? WorkspaceMessages.executableNotAllowed(executable),
      );
    }

    return {
      executable,
      args,
      displayCommand: [executable, ...args].join(ARGUMENT_SEPARATOR),
      cwd: await this.resolveCwd(inputCwd),
      timeoutMs: timeoutSeconds * MILLISECONDS_PER_SECOND,
      risk: classification.risk,
    };
  }

  private async resolveCwd(inputCwd?: string): Promise<string> {
    if (inputCwd === undefined) {
      return this.workspace.root;
    }

    const absolutePath = await this.workspace
      .resolveSafe(inputCwd)
      .catch((error: unknown) => Promise.reject(ToolValidationError.from(error)));
    const relativePath = this.workspace.toRelative(absolutePath);

    if (PathPolicy.isGitPath(relativePath)) {
      throw new ToolValidationError(GIT_PROTECTED_MESSAGE);
    }

    const stats = await stat(absolutePath).catch((error: unknown) => {
      if (ErrorInspector.isMissingPath(error)) {
        return null;
      }
      throw error;
    });
    if (stats === null) {
      throw new ToolValidationError(WorkspaceMessages.directoryNotFound(relativePath));
    }
    if (!stats.isDirectory()) {
      throw new ToolValidationError(WorkspaceMessages.isNotADirectory(relativePath));
    }

    return absolutePath;
  }
}
