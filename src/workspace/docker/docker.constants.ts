export const DOCKER_BINARY = 'docker';
export const DOCKER_TIMEOUT_MS = 10_000;
export const DOCKER_MAX_BUFFER_BYTES = 1024 * 1024;

// One line per running container: its name, its published ports and the compose project it
// belongs to. The project label is what tells a container of this workspace apart from a stray
// one that happens to hold the same port.
export const DOCKER_COMPOSE_PROJECT_LABEL = 'com.docker.compose.project';
export const DOCKER_PS_ARGS: readonly string[] = [
  'ps',
  '--format',
  `{{.Names}}\t{{.Ports}}\t{{.Label "${DOCKER_COMPOSE_PROJECT_LABEL}"}}`,
];
export const DOCKER_PS_FIELD_SEPARATOR = '\t';
export const DOCKER_PS_FIELD_COUNT = 3;

// Where compose publishes a host port: "0.0.0.0:55432->5432/tcp", with an optional address in
// front of the host port.
export const DOCKER_PUBLISHED_PORT_PATTERN =
  /(?:^|[\s,])(?:(?:\d{1,3}(?:\.\d{1,3}){3}|\[[^\]]*\]):)?(\d+)->/g;

export const COMPOSE_FILE_NAMES: readonly string[] = [
  'docker-compose.yml',
  'docker-compose.yaml',
  'compose.yml',
  'compose.yaml',
];

export const COMPOSE_PROJECT_NAME_VARIABLE = 'COMPOSE_PROJECT_NAME';
export const COMPOSE_SERVICES_KEY_PATTERN = /^services:\s*$/;
export const COMPOSE_NAME_KEY_PATTERN = /^name:\s*["']?([\w.-]+)["']?\s*$/;
export const COMPOSE_PORTS_KEY_PATTERN = /^(\s*)ports:\s*(.*)$/;
export const COMPOSE_LIST_ENTRY_PATTERN = /^(\s*)-\s*(.*)$/;
export const COMPOSE_PUBLISHED_KEY_PATTERN = /^\s*published:\s*["']?(\d+)["']?\s*$/;
export const COMPOSE_INLINE_LIST_PATTERN = /^\[(.*)\]$/;
export const COMPOSE_PORT_MAPPING_PATTERN = /^(?:[\w.[\]:]+:)?(\d+):\d+(?:\/\w+)?$/;
// Compose lowercases the project name and keeps only these characters when it derives one from
// the directory name.
export const COMPOSE_PROJECT_NAME_NOISE_PATTERN = /[^a-z0-9_-]/g;
