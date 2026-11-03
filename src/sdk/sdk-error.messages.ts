import { OPENAI_API_KEY_VARIABLE } from '../config/env.constants';

export class SdkErrorMessages {
  static invalidApiKey(original: string): string {
    return (
      `the provider rejected ${OPENAI_API_KEY_VARIABLE}: check the key in .env ` +
      `(see .env.example). Provider said: ${original}`
    );
  }

  static missingApiKey(original: string): string {
    return `${OPENAI_API_KEY_VARIABLE} is missing or empty: ${original}`;
  }

  static callCapExceeded(spent: number, cap: number): string {
    return (
      `the call was stopped after ${spent} tokens: one agent call may spend at most ${cap} ` +
      'tokens, so it was aborted instead of spending the budget of the whole run'
    );
  }

  static rateLimited(original: string): string {
    return `rate limit reached, try again later: ${original}`;
  }

  static contextWindowExceeded(original: string): string {
    return `the conversation exceeded the model context window: ${original}`;
  }

  static modelNotAvailable(original: string): string {
    return `the model is not available for this account: ${original}`;
  }

  static providerUnavailable(status: number, original: string): string {
    return `the provider returned ${status}, try again later: ${original}`;
  }

  static misconfigured(original: string): string {
    return `the agent is misconfigured: ${original}`;
  }
}
