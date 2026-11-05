import { MAX_REPEATED_ARGUMENTS_CHARACTERS } from '../commands/failures/failure-diagnosis.constants';

const START = 0;
const NO_ARGUMENTS = '';

// One line standing for the arguments of a tool call, so two calls made with the same arguments
// are recognised as the same call whatever order the model wrote the fields in. It is only ever
// compared and shown, never parsed back.
export class ToolArgumentSignature {
  static of(input: unknown): string {
    if (typeof input !== 'object' || input === null) {
      return NO_ARGUMENTS;
    }
    const entries = Object.entries(input as Record<string, unknown>)
      .map(([name, value]) => `${name}=${ToolArgumentSignature.valueOf(value)}`)
      .sort();
    const signature = entries.join(' ');

    return signature.length <= MAX_REPEATED_ARGUMENTS_CHARACTERS
      ? signature
      : signature.slice(START, MAX_REPEATED_ARGUMENTS_CHARACTERS);
  }

  private static valueOf(value: unknown): string {
    try {
      return JSON.stringify(value) ?? String(value);
    } catch {
      return String(value);
    }
  }
}
