import { access } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { WorkspaceMessages } from '../workspace.messages';
import { WorkspaceService } from '../workspace.service';
import {
  ALLOWED_EXECUTABLES,
  DENIED_FLAGS,
  DOCKER_COMPOSE_APPROVAL_SUBCOMMANDS,
  DOCKER_COMPOSE_SAFE_SUBCOMMANDS,
  DOCKER_COMPOSE_SUBCOMMAND,
  DOCKER_DENIED_FLAGS,
  DOCKER_EXECUTABLE,
  DOCKER_SUBCOMMAND_HINT,
  GIT_EXECUTABLE,
  HOME_PATH_PREFIX,
  LOCAL_TOOL_MISSING_HINT,
  NODE_DENIED_FLAGS,
  NODE_EXECUTABLE,
  NODE_MODULES_BIN_DIRECTORY,
  NODE_SCRIPT_HINT,
  NPM_EXECUTABLE,
  NPM_INSTALL_SUBCOMMANDS,
  NPM_PACKAGE_SUBCOMMANDS,
  NPM_RUN_SUBCOMMAND,
  NPM_SAFE_SUBCOMMANDS,
  NPM_SUBCOMMAND_HINT,
  NPX_EXECUTABLE,
} from './command-policy.constants';
import type { CommandClassification } from './command-policy.types';
import { CommandRisk } from './command-risk.enum';

const FLAG_PREFIX = '-';
const FLAG_VALUE_SEPARATOR = '=';
const PARENT_SEGMENT = '..';
const PATH_SEGMENT_PATTERN = /[\\/]/;
const FIRST_POSITIONAL = 0;
const SECOND_POSITIONAL = 1;
const ONLY_SUBCOMMAND = 1;

// The allowlist below protects against mistakes of the model, it is not isolation: `npm run
// <script>` executes whatever package.json says, and agents can edit package.json. Real isolation
// would mean running the workspace in a container, which is out of scope for now.
// run_command is mutatesWorkspace = true, but file changes made by commands (installs, build
// output, generated files) are not seen by ChangeTracker: git_status is the source of truth.
export class CommandPolicy {
  static async classify(
    tokens: readonly string[],
    workspace: WorkspaceService,
  ): Promise<CommandClassification> {
    const [executable, ...args] = tokens;

    if (executable === GIT_EXECUTABLE) {
      return CommandPolicy.denied(WorkspaceMessages.gitCommandDenied());
    }
    if (!ALLOWED_EXECUTABLES.includes(executable)) {
      return CommandPolicy.denied(WorkspaceMessages.executableNotAllowed(executable));
    }

    const deniedFlag = CommandPolicy.deniedFlagOf(executable, args);
    if (deniedFlag !== null) {
      return CommandPolicy.denied(WorkspaceMessages.deniedCommandFlag(deniedFlag));
    }

    const escapingArgument = await CommandPolicy.escapingArgumentOf(args, workspace);
    if (escapingArgument !== null) {
      return CommandPolicy.denied(WorkspaceMessages.argumentOutsideWorkspace(escapingArgument));
    }

    const positional = args.filter((argument) => !argument.startsWith(FLAG_PREFIX));

    if (executable === NPM_EXECUTABLE) {
      return CommandPolicy.classifyNpm(positional);
    }
    if (executable === NPX_EXECUTABLE) {
      return CommandPolicy.classifyNpx(positional, workspace);
    }
    if (executable === NODE_EXECUTABLE) {
      return CommandPolicy.classifyNode(positional, workspace);
    }
    if (executable === DOCKER_EXECUTABLE) {
      return CommandPolicy.classifyDocker(positional);
    }

    return CommandPolicy.classifyLocalTool(executable, workspace);
  }

  private static classifyNpm(positional: readonly string[]): CommandClassification {
    const subcommand = positional[FIRST_POSITIONAL];

    if (subcommand === undefined) {
      return CommandPolicy.denied(
        WorkspaceMessages.missingSubcommand(NPM_EXECUTABLE, NPM_SUBCOMMAND_HINT),
      );
    }
    if (subcommand === NPM_RUN_SUBCOMMAND) {
      return positional[SECOND_POSITIONAL] === undefined
        ? CommandPolicy.denied(
            WorkspaceMessages.missingSubcommand(NPM_EXECUTABLE, NPM_SUBCOMMAND_HINT),
          )
        : CommandPolicy.safe();
    }
    if (NPM_SAFE_SUBCOMMANDS.includes(subcommand)) {
      return CommandPolicy.safe();
    }
    if (NPM_INSTALL_SUBCOMMANDS.includes(subcommand)) {
      return positional.length > ONLY_SUBCOMMAND
        ? CommandPolicy.needsApproval()
        : CommandPolicy.safe();
    }
    if (NPM_PACKAGE_SUBCOMMANDS.includes(subcommand)) {
      return CommandPolicy.needsApproval();
    }

    return CommandPolicy.denied(
      WorkspaceMessages.subcommandNotAllowed(NPM_EXECUTABLE, subcommand, NPM_SUBCOMMAND_HINT),
    );
  }

  private static async classifyNpx(
    positional: readonly string[],
    workspace: WorkspaceService,
  ): Promise<CommandClassification> {
    const tool = positional[FIRST_POSITIONAL];
    if (tool === undefined) {
      return CommandPolicy.denied(
        WorkspaceMessages.missingSubcommand(NPX_EXECUTABLE, NODE_SCRIPT_HINT),
      );
    }

    return (await CommandPolicy.isInstalledLocally(tool, workspace))
      ? CommandPolicy.safe()
      : CommandPolicy.needsApproval();
  }

  private static async classifyNode(
    positional: readonly string[],
    workspace: WorkspaceService,
  ): Promise<CommandClassification> {
    const script = positional[FIRST_POSITIONAL];
    if (script === undefined) {
      return CommandPolicy.denied(
        WorkspaceMessages.missingSubcommand(NODE_EXECUTABLE, NODE_SCRIPT_HINT),
      );
    }

    try {
      await workspace.resolveSafe(script);
    } catch {
      return CommandPolicy.denied(WorkspaceMessages.argumentOutsideWorkspace(script));
    }

    return CommandPolicy.safe();
  }

  private static classifyDocker(positional: readonly string[]): CommandClassification {
    const [subcommand, composeSubcommand] = positional;

    if (subcommand !== DOCKER_COMPOSE_SUBCOMMAND || composeSubcommand === undefined) {
      return CommandPolicy.denied(
        WorkspaceMessages.subcommandNotAllowed(
          DOCKER_EXECUTABLE,
          positional.join(' '),
          DOCKER_SUBCOMMAND_HINT,
        ),
      );
    }
    if (DOCKER_COMPOSE_SAFE_SUBCOMMANDS.includes(composeSubcommand)) {
      return CommandPolicy.safe();
    }
    if (DOCKER_COMPOSE_APPROVAL_SUBCOMMANDS.includes(composeSubcommand)) {
      return CommandPolicy.needsApproval();
    }

    return CommandPolicy.denied(
      WorkspaceMessages.subcommandNotAllowed(
        DOCKER_EXECUTABLE,
        `${subcommand} ${composeSubcommand}`,
        DOCKER_SUBCOMMAND_HINT,
      ),
    );
  }

  private static async classifyLocalTool(
    executable: string,
    workspace: WorkspaceService,
  ): Promise<CommandClassification> {
    return (await CommandPolicy.isInstalledLocally(executable, workspace))
      ? CommandPolicy.safe()
      : CommandPolicy.denied(
          WorkspaceMessages.localToolMissing(executable, LOCAL_TOOL_MISSING_HINT),
        );
  }

  private static async isInstalledLocally(
    name: string,
    workspace: WorkspaceService,
  ): Promise<boolean> {
    if (PATH_SEGMENT_PATTERN.test(name)) {
      return false;
    }

    try {
      await access(join(workspace.root, NODE_MODULES_BIN_DIRECTORY, name));
      return true;
    } catch {
      return false;
    }
  }

  private static deniedFlagOf(executable: string, args: readonly string[]): string | null {
    const denied = [
      ...DENIED_FLAGS,
      ...(executable === NODE_EXECUTABLE ? NODE_DENIED_FLAGS : []),
      ...(executable === DOCKER_EXECUTABLE ? DOCKER_DENIED_FLAGS : []),
    ];

    for (const argument of args) {
      if (!argument.startsWith(FLAG_PREFIX)) {
        continue;
      }
      const [name] = argument.split(FLAG_VALUE_SEPARATOR);
      if (denied.includes(name)) {
        return name;
      }
    }

    return null;
  }

  private static async escapingArgumentOf(
    args: readonly string[],
    workspace: WorkspaceService,
  ): Promise<string | null> {
    for (const argument of args) {
      const value = CommandPolicy.valueOf(argument);
      if (value === '') {
        continue;
      }
      if (value.startsWith(HOME_PATH_PREFIX)) {
        return value;
      }
      if (!isAbsolute(value) && !CommandPolicy.hasParentSegment(value)) {
        continue;
      }
      try {
        await workspace.resolveSafe(value);
      } catch {
        return value;
      }
    }

    return null;
  }

  private static valueOf(argument: string): string {
    if (!argument.startsWith(FLAG_PREFIX) || !argument.includes(FLAG_VALUE_SEPARATOR)) {
      return argument;
    }
    return argument.slice(argument.indexOf(FLAG_VALUE_SEPARATOR) + ONLY_SUBCOMMAND);
  }

  private static hasParentSegment(value: string): boolean {
    return value.split(PATH_SEGMENT_PATTERN).includes(PARENT_SEGMENT);
  }

  private static safe(): CommandClassification {
    return { risk: CommandRisk.Safe };
  }

  private static needsApproval(): CommandClassification {
    return { risk: CommandRisk.NeedsApproval };
  }

  private static denied(reason: string): CommandClassification {
    return { risk: CommandRisk.Denied, reason };
  }
}
