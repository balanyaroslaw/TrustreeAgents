import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import {
  DOCKER_BINARY,
  DOCKER_MAX_BUFFER_BYTES,
  DOCKER_PS_ARGS,
  DOCKER_TIMEOUT_MS,
} from './docker.constants';
import { RunningContainerParser } from './running-container.parser';
import type { RunningContainer } from './docker.types';

// The only place docker is spawned: with an argument array, never a shell, with an environment
// that carries no secrets, and read-only - it lists containers and nothing else.
//
// A machine without docker, or with a docker that is not running, reports no containers: this
// service never throws and never fails a run on its own.
@Injectable()
export class DockerService {
  async runningContainers(): Promise<readonly RunningContainer[]> {
    const output = await DockerService.execute(DOCKER_PS_ARGS);

    return output === null ? [] : RunningContainerParser.parse(output);
  }

  private static execute(args: readonly string[]): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      execFile(
        DOCKER_BINARY,
        [...args],
        {
          timeout: DOCKER_TIMEOUT_MS,
          maxBuffer: DOCKER_MAX_BUFFER_BYTES,
          encoding: 'utf8',
          env: DockerService.childEnvironment(),
        },
        (error, stdout) => {
          resolve(error === null ? stdout : null);
        },
      );
    });
  }

  // Enough to find the binary and reach the daemon socket, and nothing else.
  private static childEnvironment(): NodeJS.ProcessEnv {
    return {
      PATH: process.env.PATH ?? '',
      HOME: process.env.HOME ?? '',
      LC_ALL: 'C',
    };
  }
}
