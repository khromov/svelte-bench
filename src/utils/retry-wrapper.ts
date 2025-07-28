export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || "100", 10),
  initialDelayMs: parseInt(process.env.RETRY_INITIAL_DELAY_MS || "1000", 10),
  maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || "30000", 10),
  backoffFactor: parseFloat(process.env.RETRY_BACKOFF_FACTOR || "2"),
  onRetry: (error, attempt) => {
    console.warn(`⚠️  Retry attempt ${attempt} after error: ${error.message}`);
  },
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === opts.maxAttempts) {
        console.error(
          `❌ Failed after ${opts.maxAttempts} attempts: ${lastError.message}`
        );
        throw lastError;
      }

      opts.onRetry(lastError, attempt);

      const delayMs = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffFactor, attempt - 1),
        opts.maxDelayMs
      );

      console.log(`⏳ Waiting ${delayMs}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError!;
}