import { FileSystemErrorCode } from '../enums/file-system-error-code.enum';

export class ErrorInspector {
  static isErrnoException(error: unknown): error is NodeJS.ErrnoException {
    return typeof error === 'object' && error !== null && 'code' in error;
  }

  static hasCode(error: unknown, ...codes: FileSystemErrorCode[]): boolean {
    if (!ErrorInspector.isErrnoException(error)) {
      return false;
    }
    return codes.some((code) => error.code === code);
  }

  static isMissingPath(error: unknown): boolean {
    return ErrorInspector.hasCode(
      error,
      FileSystemErrorCode.NotFound,
      FileSystemErrorCode.NotADirectory,
    );
  }

  static message(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      const { message } = error as { message?: unknown };
      if (typeof message === 'string' && message !== '') {
        return message;
      }
    }
    return String(error);
  }
}
