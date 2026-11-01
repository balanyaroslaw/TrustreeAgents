import { ENV_FILE_NAME } from './env.constants';

// Loads .env into process.env at startup. Node does this natively; a missing file is not an
// error, because every variable can also come from the real environment.
export class EnvironmentFile {
  static load(): void {
    try {
      process.loadEnvFile(ENV_FILE_NAME);
    } catch {
      return;
    }
  }
}
