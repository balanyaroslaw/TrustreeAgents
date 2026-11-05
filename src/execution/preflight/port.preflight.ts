import { Inject, Injectable } from '@nestjs/common';
import { ComposePortsReader } from '../../workspace/docker/compose-ports.reader';
import { DockerService } from '../../workspace/docker/docker.service';
import type { PortConflict, RunningContainer } from '../../workspace/docker/docker.types';

const NO_PORTS = 0;

// Refuses a run that would fail on every attempt: a host port the workspace's compose file
// publishes is held by a container of another compose project, so the suite cannot start its own
// database however the code is changed.
//
// It only ever reports what it read plainly. A workspace with no compose file, a compose file
// with no fixed host port, a machine without docker and a docker that is not running all leave
// it with nothing to say, and the run goes ahead.
@Injectable()
export class PortPreflight {
  constructor(
    @Inject(ComposePortsReader) private readonly compose: ComposePortsReader,
    @Inject(DockerService) private readonly docker: DockerService,
  ) {}

  async conflicts(): Promise<readonly PortConflict[]> {
    const { project, hostPorts } = await this.compose.read();
    if (hostPorts.length === NO_PORTS) {
      return [];
    }
    const containers = await this.docker.runningContainers();

    return hostPorts.flatMap((port) => PortPreflight.conflictOn(port, project, containers));
  }

  // A container of this workspace's own compose project holding the port is what compose does:
  // the run reuses it. Any other container is in the way.
  private static conflictOn(
    port: number,
    project: string,
    containers: readonly RunningContainer[],
  ): PortConflict[] {
    const holder = containers.find(
      (container) => container.hostPorts.includes(port) && container.composeProject !== project,
    );

    return holder === undefined
      ? []
      : [{ port, container: holder.name, composeProject: holder.composeProject }];
  }
}
