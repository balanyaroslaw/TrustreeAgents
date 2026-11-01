// Thrown before anything is created: the run never started, so there is no branch, no report and
// no run row. The caller shows the message and the workspace is untouched.
export class RunRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RunRefusedError';
  }
}
