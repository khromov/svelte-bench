/**
 * TUI Event Emitter
 * Emits JSON events to stdout for the TUI to parse
 */

export type TUIEventType =
  | 'test_start'
  | 'test_complete'
  | 'sample_progress'
  | 'rate_limit'
  | 'error'
  | 'complete';

export interface TUIEvent {
  type: TUIEventType;
  test?: string;
  sample?: number;
  total?: number;
  passed?: boolean;
  retryAfter?: number;
  error?: string;
  passAtOne?: number;
  passAtTen?: number;
  resultsSaved?: string;
}

/**
 * Check if running in TUI mode
 */
export function isTUIMode(): boolean {
  return process.env.TUI_MODE === 'true';
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
 * Emit test start event
 */
export function emitTestStart(testName: string, sampleIndex: number, total: number): void {
  emitTUIEvent({
    type: 'test_start',
    test: testName,
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
  passAtTen?: number
): void {
  emitTUIEvent({
    type: 'test_complete',
    test: testName,
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
export function emitSampleProgress(testName: string, current: number, total: number): void {
  emitTUIEvent({
    type: 'sample_progress',
    test: testName,
    sample: current,
    total,
  });
}

/**
 * Emit rate limit event
 */
export function emitRateLimit(retryAfter: number): void {
  emitTUIEvent({
    type: 'rate_limit',
    retryAfter,
  });
}

/**
 * Emit error event
 */
export function emitError(testName: string, error: string): void {
  emitTUIEvent({
    type: 'error',
    test: testName,
    error,
  });
}

/**
 * Emit completion event
 */
export function emitComplete(resultsSaved: string): void {
  emitTUIEvent({
    type: 'complete',
    resultsSaved,
  });
}
