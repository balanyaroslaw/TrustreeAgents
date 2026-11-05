import { Inject, Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { WorkspaceService } from '../workspace.service';
import {
  COMPOSE_FILE_NAMES,
  COMPOSE_PROJECT_NAME_NOISE_PATTERN,
  COMPOSE_PROJECT_NAME_VARIABLE,
} from './docker.constants';
import { ComposePortsParser } from './compose-ports.parser';
import type { ComposePorts } from './docker.types';

const NO_PORTS: readonly number[] = [];

// What the workspace's own compose file publishes on this machine, and the project name compose
// would give it. A workspace without a compose file, or with one that cannot be read, publishes
// nothing: the preflight that reads this then has nothing to check.
@Injectable()
export class ComposePortsReader {
  constructor(@Inject(WorkspaceService) private readonly workspace: WorkspaceService) {}

  async read(): Promise<ComposePorts> {
    const content = await this.composeFile();
    if (content === null) {
      return { project: this.defaultProject(), hostPorts: NO_PORTS };
    }

    return {
      project: ComposePortsParser.projectName(content) ?? this.defaultProject(),
      hostPorts: ComposePortsParser.hostPorts(content),
    };
  }

  private async composeFile(): Promise<string | null> {
    for (const name of COMPOSE_FILE_NAMES) {
      const content = await this.readIfPresent(name);
      if (content !== null) {
        return content;
      }
    }

    return null;
  }

  private async readIfPresent(name: string): Promise<string | null> {
    try {
      return await readFile(await this.workspace.resolveSafe(name), 'utf8');
    } catch {
      return null;
    }
  }

  // The same name compose derives when the file names none: the environment variable if it is
  // set, otherwise the directory name, lowercased and stripped of what compose strips.
  private defaultProject(): string {
    const configured = process.env[COMPOSE_PROJECT_NAME_VARIABLE];
    if (configured !== undefined && configured.trim() !== '') {
      return configured.trim().toLowerCase();
    }

    return basename(this.workspace.root)
      .toLowerCase()
      .replace(COMPOSE_PROJECT_NAME_NOISE_PATTERN, '');
  }
}
