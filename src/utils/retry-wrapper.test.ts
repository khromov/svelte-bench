import { describe, it, expect, vi } from "vitest";
import { withRetry } from "./retry-wrapper";

describe("retry-wrapper", () => {
  it("should succeed on first attempt", async () => {
    const mockFn = vi.fn().mockResolvedValue("success");
    const result = await withRetry(mockFn);
    
    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should retry on failure and eventually succeed", async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error("First failure"))
      .mockRejectedValueOnce(new Error("Second failure"))
      .mockResolvedValueOnce("success");
    
    const result = await withRetry(mockFn, {
      maxAttempts: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
    });
    
    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it("should throw after max attempts", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("Always fails"));
    
    await expect(
      withRetry(mockFn, {
        maxAttempts: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
      })
    ).rejects.toThrow("Always fails");
    
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it("should use exponential backoff", async () => {
    const delays: number[] = [];
    const startTime = Date.now();
    
    const mockFn = vi.fn().mockImplementation(() => {
      delays.push(Date.now() - startTime);
      throw new Error("Test error");
    });
    
    await withRetry(mockFn, {
      maxAttempts: 3,
      initialDelayMs: 100,
      backoffFactor: 2,
      maxDelayMs: 1000,
    }).catch(() => {}); // Ignore the error
    
    expect(mockFn).toHaveBeenCalledTimes(3);
    
    // Check delays are approximately correct (with some tolerance)
    expect(delays[1]).toBeGreaterThanOrEqual(90); // ~100ms
    expect(delays[2]).toBeGreaterThanOrEqual(180); // ~200ms
  });

  it("should call onRetry callback", async () => {
    const onRetry = vi.fn();
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error("First failure"))
      .mockResolvedValueOnce("success");
    
    await withRetry(mockFn, {
      maxAttempts: 2,
      initialDelayMs: 10,
      onRetry,
    });
    
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({ message: "First failure" }),
      1
    );
  });
});