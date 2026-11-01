// A problem with the environment, not with the work: the message says which variable is wrong
// and where to put it, and the command stops without a stack trace.
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
