import {
  DOCKER_PS_FIELD_COUNT,
  DOCKER_PS_FIELD_SEPARATOR,
  DOCKER_PUBLISHED_PORT_PATTERN,
} from './docker.constants';
import type { RunningContainer } from './docker.types';

const LINE_SEPARATOR = '\n';
const NAME_INDEX = 0;
const PORTS_INDEX = 1;
const PROJECT_INDEX = 2;
const PORT_GROUP = 1;
const DECIMAL = 10;

// Reads the lines `docker ps` printed in the format DOCKER_PS_ARGS asks for. A line it does not
// recognise is skipped: the preflight it feeds may only refuse a run on something it did read.
export class RunningContainerParser {
  static parse(output: string): RunningContainer[] {
    return output
      .split(LINE_SEPARATOR)
      .map((line) => RunningContainerParser.containerOf(line))
      .filter((container): container is RunningContainer => container !== null);
  }

  private static containerOf(line: string): RunningContainer | null {
    if (line.trim() === '') {
      return null;
    }
    const fields = line.split(DOCKER_PS_FIELD_SEPARATOR);
    const name = fields[NAME_INDEX]?.trim() ?? '';
    if (fields.length < DOCKER_PS_FIELD_COUNT || name === '') {
      return null;
    }
    const project = fields[PROJECT_INDEX].trim();

    return {
      name,
      hostPorts: RunningContainerParser.hostPortsOf(fields[PORTS_INDEX]),
      composeProject: project === '' ? null : project,
    };
  }

  private static hostPortsOf(ports: string): number[] {
    const pattern = new RegExp(DOCKER_PUBLISHED_PORT_PATTERN);
    const found = new Set<number>();

    for (;;) {
      const match = pattern.exec(ports);
      if (match === null) {
        return [...found];
      }
      found.add(Number.parseInt(match[PORT_GROUP], DECIMAL));
    }
  }
}
