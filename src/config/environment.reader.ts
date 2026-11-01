import { ConfigurationError } from './configuration.error';
import { MISSING_API_KEY_MESSAGE, OPENAI_API_KEY_VARIABLE } from './env.constants';
import { modelEnvironmentSchema } from './env.schema';
import type { ModelEnvironment } from './env.types';

const FIRST_PATH_SEGMENT = 0;

// Read only by the code that is about to call a model, so every command that does not call one
// keeps working without an API key.
export class EnvironmentReader {
  static modelEnvironment(): ModelEnvironment {
    const parsed = modelEnvironmentSchema.safeParse(EnvironmentReader.present());
    if (parsed.success) {
      return parsed.data;
    }
    throw new ConfigurationError(EnvironmentReader.reasonOf(parsed.error.issues));
  }

  // An empty variable is treated as absent, so a stray "OPENAI_API_KEY=" in .env gives the same
  // clear message as a missing one.
  private static present(): Record<string, string> {
    const values: Record<string, string> = {};
    for (const [name, value] of Object.entries(process.env)) {
      if (typeof value === 'string' && value.trim() !== '') {
        values[name] = value.trim();
      }
    }
    return values;
  }

  private static reasonOf(issues: readonly { readonly path: readonly PropertyKey[] }[]): string {
    const names = issues.map((issue) => String(issue.path[FIRST_PATH_SEGMENT]));
    if (names.includes(OPENAI_API_KEY_VARIABLE)) {
      return MISSING_API_KEY_MESSAGE;
    }
    return `the environment variables ${names.join(', ')} are not valid`;
  }
}
