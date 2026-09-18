/**
 * Implementation of the HumanEval methodology from the paper
 * "Evaluating Large Language Models Trained on Code"
 *
 * This implements the pass@k metric calculation as described in the paper.
 */

/**
 * Calculate pass@k using the unbiased estimator formula from the HumanEval paper
 *
 * The pass@k metric measures the probability that at least one of k randomly
 * selected samples would pass all unit tests.
 *
 * Formula: pass@k = 1 - (n-c choose k) / (n choose k)
 *
 * Numerically stable implementation using product form:
 * pass@k = 1 - prod(1 - k/j) for j from n-c+1 to n
 *
 * @param n Total number of samples
 * @param c Number of correct samples (samples that pass all tests)
 * @param k K in pass@k (number of samples to select)
 * @returns Unbiased estimate of pass@k
 */
export function calculatePassAtK(n: number, c: number, k: number): number {
  // If we have more correct samples than k, or exactly k samples remain
  // after removing all correct ones, we're guaranteed to get at least
  // one correct sample in our selection of k
  if (n - c < k) return 1.0;

  // Calculate 1 - prod(1 - k/j) for j from n-c+1 to n
  let result = 1.0;
  for (let j = n - c + 1; j <= n; j++) {
    result *= 1.0 - k / j;
  }

  return 1.0 - result;
}

/**
 * Interface for storing HumanEval results
 */
export interface HumanEvalResult {
  testName: string;
  provider: string;
  modelId: string;
  numSamples: number;
  numCorrect: number;
  pass1: number;
  pass10: number;
  context?: {
    used: boolean;
    filename?: string;
    content?: string;
  };
  samples: {
    index: number;
    code: string;
    success: boolean;
    errors: string[];
    temperature?: number; // Added temperature tracking
  }[];
  /**
   * Generation speed in tokens per second, measured separately from the benchmark run
   * (see ollama-tps.ts). Only populated for local (Ollama) models.
   */
  tps?: number;
  tpsDetails?: TpsDetails;
  /**
   * How many output tokens a typical response contains and, derived from `tps`, how long
   * it took to generate. Measured separately (see ollama-token-times.ts) and joined in by
   * merge.ts, so it is only present in the merged results of local (Ollama) models.
   */
  tokenTimes?: TokenTimes;
}

/**
 * How a `tps` figure was obtained, so the measurement can be reproduced or audited
 */
export interface TpsDetails {
  /** The test whose prompt was sent to the model */
  testName: string;
  /** Generated (decode) tokens and how long they took, in nanoseconds, as reported by Ollama */
  evalCount: number;
  evalDurationNs: number;
  /** Prompt (prefill) tokens and how long they took, in nanoseconds, as reported by Ollama */
  promptEvalCount: number;
  promptEvalDurationNs: number;
  /** Prompt processing speed in tokens per second */
  promptTps: number;
  /** Time to load the model into memory, in nanoseconds */
  loadDurationNs: number;
  /** When the measurement was taken (ISO 8601) */
  measuredAt: string;
}

/**
 * One measurement request: a single sample of one test prompt, with the counts and
 * timings Ollama reported for it
 */
export interface TokenTimeSample {
  /** The test whose prompt was sent to the model */
  testName: string;
  /** Generated (decode) tokens and how long they took, in nanoseconds, as reported by Ollama */
  evalCount: number;
  evalDurationNs: number;
  /** Prompt (prefill) tokens and how long they took, in nanoseconds, as reported by Ollama */
  promptEvalCount: number;
  promptEvalDurationNs: number;
  /** Wall time of the whole request as seen by Ollama, in nanoseconds */
  totalDurationNs: number;
  /** When the sample was taken (ISO 8601) */
  measuredAt: string;
}

/**
 * Average response size of a model, from one sample per test (see ollama-token-times.ts)
 */
export interface TokenTimes {
  /** Number of samples the averages are based on (one per test) */
  sampleCount: number;
  /** Mean generated tokens per response */
  avgOutputTokens: number;
  /** Mean prompt tokens per request */
  avgPromptTokens: number;
  /** Mean generation time per response as timed by Ollama during the measurement, in nanoseconds */
  avgEvalDurationNs: number;
  /**
   * Estimated seconds a typical response took during the benchmark: avgOutputTokens / tps.
   * Null when the model has no `tps` measurement to divide by.
   */
  avgResponseSeconds: number | null;
  /** When the last sample was taken (ISO 8601) */
  measuredAt: string;
  samples: TokenTimeSample[];
}
