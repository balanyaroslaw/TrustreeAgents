import { isAbsolute, resolve } from 'node:path';
import { Command, CommandRunner, Option } from 'nest-commander';

export interface RunCommandOptions {
  workspace: string;
  tui: boolean;
}

export function resolveWorkspace(workspace?: string, cwd: string = process.cwd()): string {
  const candidate = workspace?.trim() ? workspace.trim() : '.';
  return isAbsolute(candidate) ? resolve(candidate) : resolve(cwd, candidate);
}

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
      console.error('error: missing prompt argument. Usage: team run "<prompt>" [-w <path>]');
      process.exit(1);
    }

    console.log(`prompt: ${prompt}`);
    console.log(`workspace: ${resolveWorkspace(options.workspace)}`);
    console.log(`tui: ${options.tui ? 'enabled' : 'disabled'}`);
    console.log('run: not implemented yet');
  }

  @Option({
    flags: '-w, --workspace <path>',
    description: 'workspace directory the agents work in',
    defaultValue: '.',
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
