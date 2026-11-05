// One running container as `docker ps` reported it.
export interface RunningContainer {
  readonly name: string;
  readonly hostPorts: readonly number[];
  // The compose project the container belongs to, or null when it was not started by compose.
  readonly composeProject: string | null;
}

// What the workspace's compose file publishes on this machine, and the project name compose
// would use for it. An absent or unreadable compose file yields no ports at all.
export interface ComposePorts {
  readonly project: string;
  readonly hostPorts: readonly number[];
}

// A host port the workspace needs that another compose project's container already holds.
export interface PortConflict {
  readonly port: number;
  readonly container: string;
  readonly composeProject: string | null;
}
