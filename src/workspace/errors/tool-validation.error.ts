import { ErrorInspector } from '../utils/error.inspector';

export class ToolValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolValidationError';
  }

  static from(error: unknown): ToolValidationError {
    return new ToolValidationError(ErrorInspector.message(error));
  }
}
