import { delimiter, join } from 'node:path';
import { NODE_MODULES_BIN_DIRECTORY } from './command-policy.constants';

const ALLOWED_VARIABLES: readonly string[] = ['PATH', 'HOME', 'USER', 'LANG', 'LC_ALL', 'TMPDIR'];

const FIXED_VARIABLES: Readonly<Record<string, string>> = {
  CI: 'true',
  NO_COLOR: '1',
  TERM: 'dumb',
  npm_config_update_notifier: 'false',
  npm_config_fund: 'false',
};

export class ChildEnvironmentBuilder {
  static build(workspaceRoot: string): NodeJS.ProcessEnv {
    const environment: NodeJS.ProcessEnv = {};

    for (const name of ALLOWED_VARIABLES) {
      const value = process.env[name];
      if (value !== undefined && value !== '') {
        environment[name] = value;
      }
    }

    return {
      ...environment,
      ...FIXED_VARIABLES,
      PATH: ChildEnvironmentBuilder.searchPath(workspaceRoot, environment.PATH),
    };
  }

  private static searchPath(workspaceRoot: string, inherited?: string): string {
    const localBin = join(workspaceRoot, NODE_MODULES_BIN_DIRECTORY);
    return inherited === undefined ? localBin : `${inherited}${delimiter}${localBin}`;
  }
}
