import { expect, test, describe } from "vitest";
import { calculatePassAtK } from "./humaneval";

describe("HumanEval pass@k calculation", () => {
  // Test basic functionality
  test("calculatePassAtK returns 1.0 when all samples are correct", () => {
    // When all samples are correct (n = c), the pass@k should be 1.0
    expect(calculatePassAtK(10, 10, 5)).toBe(1.0);
  });

  test("calculatePassAtK returns 0.0 when no samples are correct", () => {
    // When no samples are correct (c = 0) and k <= n, the pass@k should be 0.0
    expect(calculatePassAtK(10, 0, 5)).toBe(0.0);
  });

  test("calculatePassAtK returns 1.0 when we need to select more samples than incorrect ones", () => {
    // If n - c < k, then pass@k should be 1.0 because we're guaranteed to select at least one correct sample
    expect(calculatePassAtK(10, 8, 3)).toBe(1.0);
  });

  // Test edge cases
  test("calculatePassAtK handles edge case of k = 1", () => {
    // For k = 1, pass@k should equal the ratio of correct samples to total samples
    // Using toBeCloseTo instead of toBe to handle floating point precision
    expect(calculatePassAtK(100, 20, 1)).toBeCloseTo(0.2, 10);
  });

  test("calculatePassAtK handles edge case of k = n", () => {
    // For k = n, if there's at least one correct sample, pass@k should be 1.0
    expect(calculatePassAtK(10, 1, 10)).toBe(1.0);
    // If there are no correct samples, pass@k should be 0.0
    expect(calculatePassAtK(10, 0, 10)).toBe(0.0);
  });

  // Test the formula against directly calculated values
  test("calculatePassAtK matches manually calculated values", () => {
    // For n=5, c=2, k=1:
    // 1 - ((5-2) choose 1) / (5 choose 1) = 1 - (3/5) = 0.4
    expect(calculatePassAtK(5, 2, 1)).toBeCloseTo(0.4, 10);

    // For n=10, c=3, k=2:
    // 1 - ((10-3) choose 2) / (10 choose 2) = 1 - (7*6/2) / (10*9/2) = 1 - 21/45 ≈ 0.5333
    expect(calculatePassAtK(10, 3, 2)).toBeCloseTo(0.5333, 4);

    // For n=20, c=10, k=5:
    // This is more complex to calculate by hand, but we can verify with our function
    const result = calculatePassAtK(20, 10, 5);
    // Using the product form: 1 - prod(1 - k/j) for j from n-c+1 to n
    let expected = 1.0;
    for (let j = 20 - 10 + 1; j <= 20; j++) {
      expected *= 1.0 - 5.0 / j;
    }
    expected = 1.0 - expected;

    expect(result).toBeCloseTo(expected, 10);
  });

  // Test compatibility with the Python implementation shown in the paper
  test("calculatePassAtK is compatible with the Python implementation from the paper", () => {
    // The paper provides this Python function:
    /*
    def pass_at_k(n, c, k):
        """
        :param n: total number of samples
        :param c: number of correct samples
        :param k: k in pass@$k$
        """
        if n - c < k: return 1.0
        return 1.0 - np.prod(1.0 - k / np.arange(n - c + 1, n + 1))
    */

    // Test some values to ensure our TypeScript implementation matches
    // what the Python implementation would produce

    // Example 1: n=50, c=10, k=5
    let expected1 = 0.0;
    if (50 - 10 < 5) {
      expected1 = 1.0;
    } else {
      let prod = 1.0;
      for (let j = 50 - 10 + 1; j <= 50; j++) {
        prod *= 1.0 - 5.0 / j;
      }
      expected1 = 1.0 - prod;
    }
    expect(calculatePassAtK(50, 10, 5)).toBeCloseTo(expected1, 10);

    // Example 2: n=200, c=50, k=10
    let expected2 = 0.0;
    if (200 - 50 < 10) {
      expected2 = 1.0;
    } else {
      let prod = 1.0;
      for (let j = 200 - 50 + 1; j <= 200; j++) {
        prod *= 1.0 - 10.0 / j;
      }
      expected2 = 1.0 - prod;
    }
    expect(calculatePassAtK(200, 50, 10)).toBeCloseTo(expected2, 10);
  });

  // Test the bias of the naïve estimator as mentioned in the paper
  test("demonstrates the bias in naive estimator versus unbiased estimator", () => {
    // The paper mentions that estimating pass@k with 1-(1-p)^k where p is the
    // empirical pass@1 can result in a biased estimate

    const n = 100; // Total number of samples
    const c = 20; // Correct samples
    const k = 10; // k in pass@k

    // Unbiased estimator from the paper
    const unbiasedEstimate = calculatePassAtK(n, c, k);

    // Naive estimator: 1-(1-p)^k where p = c/n
    const naiveEstimate = 1 - Math.pow(1 - c / n, k);

    // The naive estimate should be lower than the unbiased estimate
    // as mentioned in the paper
    expect(naiveEstimate).toBeLessThan(unbiasedEstimate);

    // We can also check that as n increases, the bias decreases
    const largerN = 1000;
    const largerC = 200; // Same proportion as before

    const unbiasedEstimateLargerN = calculatePassAtK(largerN, largerC, k);
    const naiveEstimateLargerN = 1 - Math.pow(1 - largerC / largerN, k);

    // The difference between the two estimates should be smaller
    const smallNDifference = Math.abs(unbiasedEstimate - naiveEstimate);
    const largeNDifference = Math.abs(unbiasedEstimateLargerN - naiveEstimateLargerN);

    expect(largeNDifference).toBeLessThan(smallNDifference);
  });
});
