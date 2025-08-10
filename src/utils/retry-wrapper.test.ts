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
    
    // Check delays are approximately correct (with jitter tolerance)
    // Base delays: 100ms, 200ms + jitter (10-250ms each)
    // delays[1] = time from start to 2nd attempt (after first delay)
    // delays[2] = time from start to 3rd attempt (after first + second delays)
    expect(delays[1]).toBeGreaterThanOrEqual(110); // ~100ms + min jitter
    expect(delays[1]).toBeLessThanOrEqual(350);    // ~100ms + max jitter
    expect(delays[2]).toBeGreaterThanOrEqual(320); // ~(100+200)ms + min jitter  
    expect(delays[2]).toBeLessThanOrEqual(600);    // ~(100+200)ms + max jitter
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

  it("should add jitter between 10-250ms to delay", async () => {
    const delays: number[] = [];
    const startTimes: number[] = [];
    let attemptCount = 0;
    
    const mockFn = vi.fn().mockImplementation(() => {
      if (attemptCount === 0) {
        startTimes.push(Date.now());
        attemptCount++;
        throw new Error("Test error");
      } else {
        delays.push(Date.now() - startTimes[0]);
        throw new Error("Test error");
      }
    });
    
    await withRetry(mockFn, {
      maxAttempts: 2,
      initialDelayMs: 100, // Base delay
      backoffFactor: 1,    // No exponential backoff for easier testing
      maxDelayMs: 1000,
    }).catch(() => {}); // Ignore the error
    
    expect(mockFn).toHaveBeenCalledTimes(2);
    
    // The actual delay should be base (100ms) + jitter (10-250ms)
    // So total should be between 110ms and 350ms
    expect(delays[0]).toBeGreaterThanOrEqual(110);
    expect(delays[0]).toBeLessThanOrEqual(350);
  });
});