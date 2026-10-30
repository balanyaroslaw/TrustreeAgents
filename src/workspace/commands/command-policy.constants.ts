export const ALLOWED_EXECUTABLES: readonly string[] = [
  'npm',
  'npx',
  'node',
  'tsc',
  'jest',
  'eslint',
  'prettier',
  'tsx',
  'ts-node',
  'docker',
];

export const NPM_EXECUTABLE = 'npm';
export const NPX_EXECUTABLE = 'npx';
export const NODE_EXECUTABLE = 'node';
export const DOCKER_EXECUTABLE = 'docker';
export const GIT_EXECUTABLE = 'git';

export const NODE_MODULES_BIN_DIRECTORY = 'node_modules/.bin';

export const NPM_SAFE_SUBCOMMANDS: readonly string[] = ['test', 'ci', 'ls', 'outdated'];
export const NPM_RUN_SUBCOMMAND = 'run';
export const NPM_INSTALL_SUBCOMMANDS: readonly string[] = ['install', 'i'];
export const NPM_PACKAGE_SUBCOMMANDS: readonly string[] = ['add', 'uninstall'];

export const DOCKER_COMPOSE_SUBCOMMAND = 'compose';
export const DOCKER_COMPOSE_SAFE_SUBCOMMANDS: readonly string[] = ['ps', 'logs', 'stop', 'down'];
export const DOCKER_COMPOSE_APPROVAL_SUBCOMMANDS: readonly string[] = ['up', 'start', 'restart'];

export const NODE_DENIED_FLAGS: readonly string[] = [
  '-e',
  '--eval',
  '-p',
  '--print',
  '--input-type',
  '-r',
  '--require',
];

export const DENIED_FLAGS: readonly string[] = [
  '--watch',
  '--watchAll',
  '--watch-all',
  '-g',
  '--global',
  '--prefix',
  '--location',
];

export const DOCKER_DENIED_FLAGS: readonly string[] = ['-v', '--volumes', '--rmi'];

export const GIT_COMMAND_HINT =
  'Use git_status and git_diff; committing is done by the Orchestrator';
export const LOCAL_TOOL_MISSING_HINT = 'Run "npm install" first';
export const NPM_SUBCOMMAND_HINT = 'Use npm test, npm run <script>, npm ci or npm install';
export const DOCKER_SUBCOMMAND_HINT =
  'Only docker compose ps, logs, stop, down, up, start and restart are allowed';
export const NODE_SCRIPT_HINT = 'Pass the path of a script inside the workspace';
export const HOME_PATH_PREFIX = '~';
