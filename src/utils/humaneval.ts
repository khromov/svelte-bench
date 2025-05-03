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
}
