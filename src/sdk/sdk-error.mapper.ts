import {
  MaxTurnsExceededError,
  ModelBehaviorError,
  ModelRefusalError,
  UserError,
} from '@openai/agents';
import { ErrorInspector } from '../workspace/utils/error.inspector';
import { AgentFailureKind } from '../execution/agents/agent-failure.enum';
import { SdkErrorMessages } from './sdk-error.messages';

const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const NOT_FOUND = 404;
const TOO_MANY_REQUESTS = 429;
const SERVER_ERROR = 500;

const ABORT_NAMES: readonly string[] = ['AbortError', 'APIUserAbortError'];
const CONTEXT_LENGTH_MARKERS: readonly string[] = [
  'context length',
  'context_length_exceeded',
  'maximum context',
  'too many tokens',
];
const MODEL_MARKERS: readonly string[] = ['model', 'does not exist'];
const CREDENTIALS_MARKERS: readonly string[] = ['missing credentials', 'api key', 'apikey'];

// Turns whatever the SDK or the API threw into one of our failure kinds, with a message the user
// can act on. The original message is never lost: it is kept when nothing more specific fits.
export class SdkErrorMapper {
  static map(error: unknown): AgentFailureKind {
    if (SdkErrorMapper.isAbort(error)) {
      return AgentFailureKind.Cancelled;
    }
    if (error instanceof MaxTurnsExceededError) {
      return AgentFailureKind.MaxTurns;
    }
    if (error instanceof ModelBehaviorError || error instanceof ModelRefusalError) {
      return AgentFailureKind.InvalidOutput;
    }
    if (SdkErrorMapper.isSchemaFailure(error)) {
      return AgentFailureKind.InvalidOutput;
    }
    return AgentFailureKind.ApiError;
  }

  static message(error: unknown, kind: AgentFailureKind): string {
    const original = ErrorInspector.message(error);
    if (kind !== AgentFailureKind.ApiError) {
      return original;
    }
    const status = SdkErrorMapper.statusOf(error);
    const lowered = original.toLowerCase();

    if (status === UNAUTHORIZED || status === FORBIDDEN) {
      return SdkErrorMessages.invalidApiKey(original);
    }
    if (CREDENTIALS_MARKERS.some((marker) => lowered.includes(marker)) && status === null) {
      return SdkErrorMessages.missingApiKey(original);
    }
    if (status === TOO_MANY_REQUESTS) {
      return SdkErrorMessages.rateLimited(original);
    }
    if (CONTEXT_LENGTH_MARKERS.some((marker) => lowered.includes(marker))) {
      return SdkErrorMessages.contextWindowExceeded(original);
    }
    if (status === NOT_FOUND && MODEL_MARKERS.every((marker) => lowered.includes(marker))) {
      return SdkErrorMessages.modelNotAvailable(original);
    }
    if (status !== null && status >= SERVER_ERROR) {
      return SdkErrorMessages.providerUnavailable(status, original);
    }
    if (error instanceof UserError) {
      return SdkErrorMessages.misconfigured(original);
    }
    return original;
  }

  private static isAbort(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }
    const name = (error as { name?: unknown }).name;
    return typeof name === 'string' && ABORT_NAMES.includes(name);
  }

  // A final answer that does not match the output schema arrives as a zod or parse failure.
  private static isSchemaFailure(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }
    const name = (error as { name?: unknown }).name;
    return name === 'ZodError' || name === 'SyntaxError';
  }

  private static statusOf(error: unknown): number | null {
    if (typeof error !== 'object' || error === null) {
      return null;
    }
    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : null;
  }
}
