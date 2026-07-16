/**
 * Custom error thrown when OpenRouter (or other provider) returns a 429 rate limit.
 * This error is non-retryable and should abort the entire benchmark run.
 */
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Check if an error is a RateLimitError by name (works across module boundaries).
 */
export function isRateLimitError(error: unknown): boolean {
  return error instanceof Error && error.name === "RateLimitError";
}
