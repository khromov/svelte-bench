/**
 * TUI Event Emitter
 * Emits JSON events to stdout for the TUI to parse
 */

export interface TUIRunModel {
  id: string;
  samplesPerTest: number;
}

export type TUIEvent =
  | { type: "run_start"; models: TUIRunModel[]; tests: string[] }
  | { type: "test_start"; test: string; model?: string; sample: number; total: number }
  | {
      type: "test_complete";
      test: string;
      model?: string;
      sample: number;
      total: number;
      passed: boolean;
      passAtOne?: number;
      passAtTen?: number;
    }
  | { type: "sample_progress"; test: string; model?: string; sample: number; total: number }
  | {
      type: "rate_limit";
      test: string;
      retryAfter: number;
      retryAttempt: number;
      retryDelayMs: number;
    }
  | { type: "error"; test: string; error: string }
  | { type: "complete"; resultsSaved: string };

/**
 * Check if running in TUI mode
 */
export function isTUIMode(): boolean {
  return process.env.TUI_MODE === "true";
}

/**
 * Log to console only if not in TUI mode
 */
export function log(...args: any[]): void {
  if (!isTUIMode()) {
    console.log(...args);
  }
}

/**
 * Emit a TUI event
 */
export function emitTUIEvent(event: TUIEvent): void {
  if (isTUIMode()) {
    // Output as single-line JSON
    console.log(JSON.stringify(event));
  }
}

/**
 * Emit the validated run topology before any benchmark work begins.
 */
export function emitRunStart(models: TUIRunModel[], tests: string[]): void {
  emitTUIEvent({ type: "run_start", models, tests });
}

/**
 * Emit test start event
 */
export function emitTestStart(testName: string, sampleIndex: number, total: number, model?: string): void {
  emitTUIEvent({
    type: "test_start",
    test: testName,
    model,
    sample: sampleIndex,
    total,
  });
}

/**
 * Emit test complete event
 */
export function emitTestComplete(
  testName: string,
  sampleIndex: number,
  total: number,
  passed: boolean,
  passAtOne?: number,
  passAtTen?: number,
  model?: string,
): void {
  emitTUIEvent({
    type: "test_complete",
    test: testName,
    model,
    sample: sampleIndex,
    total,
    passed,
    passAtOne,
    passAtTen,
  });
}

/**
 * Emit sample progress event
 */
export function emitSampleProgress(testName: string, current: number, total: number, model?: string): void {
  emitTUIEvent({
    type: "sample_progress",
    test: testName,
    model,
    sample: current,
    total,
  });
}

/**
 * Emit rate limit event
 */
export function emitRateLimit(testName: string, retryAttempt: number, retryDelayMs: number): void {
  emitTUIEvent({
    type: "rate_limit",
    test: testName,
    retryAttempt,
    retryAfter: Math.ceil(retryDelayMs / 1000),
    retryDelayMs,
  });
}

/**
 * Emit error event
 */
export function emitError(testName: string, error: string): void {
  emitTUIEvent({
    type: "error",
    test: testName,
    error,
  });
}

/**
 * Emit completion event
 */
export function emitComplete(resultsSaved: string): void {
  emitTUIEvent({
    type: "complete",
    resultsSaved,
  });
}
