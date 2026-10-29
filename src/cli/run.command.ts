import { Command, CommandRunner, Option } from 'nest-commander';
import {
  DEFAULT_WORKSPACE_PATH,
  INVALID_ARGUMENT_EXIT_CODE,
  MISSING_PROMPT_MESSAGE,
  RUN_NOT_IMPLEMENTED_MESSAGE,
} from './cli.constants';
import type { RunCommandOptions } from './command-options.types';
import { WorkspacePathResolver } from './workspace-path.resolver';

@Command({
  name: 'run',
  description: 'Run a prompt against the agent team (stub)',
  arguments: '[prompt]',
  argsDescription: {
    prompt: 'the task description, e.g. "add a health endpoint"',
  },
})
export class RunCommand extends CommandRunner {
  async run(inputs: string[], options: RunCommandOptions): Promise<void> {
    const prompt = inputs[0]?.trim();
    if (!prompt) {
      console.error(MISSING_PROMPT_MESSAGE);
      process.exit(INVALID_ARGUMENT_EXIT_CODE);
    }

    console.log(`prompt: ${prompt}`);
    console.log(`workspace: ${WorkspacePathResolver.toAbsolute(options.workspace)}`);
    console.log(`tui: ${options.tui ? 'enabled' : 'disabled'}`);
    console.log(RUN_NOT_IMPLEMENTED_MESSAGE);
  }

  @Option({
    flags: '-w, --workspace <path>',
    description: 'workspace directory the agents work in',
    defaultValue: DEFAULT_WORKSPACE_PATH,
  })
  parseWorkspace(value: string): string {
    return value;
  }

  @Option({
    flags: '--no-tui',
    description: 'disable the interactive TUI and print plain text',
  })
  parseNoTui(): boolean {
    return false;
  }
}
