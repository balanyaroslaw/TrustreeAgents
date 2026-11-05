// Thrown when a full-suite run failed on something only a person can change on this machine: a
// port another container holds, a docker daemon that is not running. The run stops on it at
// once, because every further attempt would fail identically and cost the same tokens.
export class HostBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HostBlockedError';
  }
}
