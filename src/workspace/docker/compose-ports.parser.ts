import {
  COMPOSE_INLINE_LIST_PATTERN,
  COMPOSE_LIST_ENTRY_PATTERN,
  COMPOSE_NAME_KEY_PATTERN,
  COMPOSE_PORTS_KEY_PATTERN,
  COMPOSE_PORT_MAPPING_PATTERN,
  COMPOSE_PUBLISHED_KEY_PATTERN,
  COMPOSE_SERVICES_KEY_PATTERN,
} from './docker.constants';

const LINE_SEPARATOR = '\n';
const ENTRY_SEPARATOR = ',';
const INDENT_GROUP = 1;
const VALUE_GROUP = 2;
const NAME_GROUP = 1;
const LIST_CONTENT_GROUP = 1;
const PORT_GROUP = 1;
const NEXT_LINE = 1;
const DECIMAL = 10;
const QUOTES = /^["']|["']$/g;

// Reads the host ports a compose file publishes, and the project name it declares, without a YAML
// parser: only the two shapes compose accepts for a port are recognised, the short "55432:5432"
// and the long form's "published:" key.
//
// Anything it is not sure about - a port range, a variable, a container port with no host port,
// a "ports:" key outside the services block - is skipped. The preflight this feeds refuses a run,
// so it may only act on what was read plainly.
export class ComposePortsParser {
  static hostPorts(content: string): number[] {
    const lines = content.split(LINE_SEPARATOR);
    const ports = new Set<number>();
    let insideServices = false;

    for (const [index, line] of lines.entries()) {
      insideServices = insideServices || COMPOSE_SERVICES_KEY_PATTERN.test(line);
      const match = insideServices ? COMPOSE_PORTS_KEY_PATTERN.exec(line) : null;
      if (match === null) {
        continue;
      }
      for (const port of ComposePortsParser.portsOf(lines, index, match)) {
        ports.add(port);
      }
    }

    return [...ports];
  }

  static projectName(content: string): string | null {
    for (const line of content.split(LINE_SEPARATOR)) {
      const match = COMPOSE_NAME_KEY_PATTERN.exec(line);
      if (match !== null) {
        return match[NAME_GROUP].toLowerCase();
      }
    }

    return null;
  }

  private static portsOf(
    lines: readonly string[],
    index: number,
    match: RegExpExecArray,
  ): number[] {
    const inline = COMPOSE_INLINE_LIST_PATTERN.exec(match[VALUE_GROUP].trim());
    if (inline !== null) {
      return ComposePortsParser.fromEntries(inline[LIST_CONTENT_GROUP].split(ENTRY_SEPARATOR));
    }

    return ComposePortsParser.fromBlock(lines, index + NEXT_LINE, match[INDENT_GROUP].length);
  }

  // Everything indented deeper than the "ports:" key itself: the short form as list entries, the
  // long form as a "published:" key inside one.
  private static fromBlock(lines: readonly string[], from: number, keyIndent: number): number[] {
    const ports: number[] = [];

    for (let index = from; index < lines.length; index += NEXT_LINE) {
      const line = lines[index];
      if (line.trim() === '') {
        continue;
      }
      if (ComposePortsParser.indentOf(line) <= keyIndent) {
        return ports;
      }
      const published = COMPOSE_PUBLISHED_KEY_PATTERN.exec(line);
      if (published !== null) {
        ports.push(Number.parseInt(published[PORT_GROUP], DECIMAL));
        continue;
      }
      const entry = COMPOSE_LIST_ENTRY_PATTERN.exec(line);
      if (entry !== null) {
        ports.push(...ComposePortsParser.fromEntries([entry[VALUE_GROUP]]));
      }
    }

    return ports;
  }

  private static fromEntries(entries: readonly string[]): number[] {
    return entries
      .map((entry) => ComposePortsParser.hostPortOf(entry))
      .filter((port): port is number => port !== null);
  }

  private static hostPortOf(entry: string): number | null {
    const match = COMPOSE_PORT_MAPPING_PATTERN.exec(entry.trim().replace(QUOTES, ''));

    return match === null ? null : Number.parseInt(match[PORT_GROUP], DECIMAL);
  }

  private static indentOf(line: string): number {
    return line.length - line.trimStart().length;
  }
}
