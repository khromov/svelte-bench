import { afterEach, describe, expect, it, vi } from "vitest";
import { emitRunStart } from "./tui-events";

describe("TUI run events", () => {
  const originalMode = process.env.TUI_MODE;

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.TUI_MODE;
    } else {
      process.env.TUI_MODE = originalMode;
    }
    vi.restoreAllMocks();
  });

  it("emits validated models, per-model samples, and tests in one run_start event", () => {
    process.env.TUI_MODE = "true";
    const output = vi.spyOn(console, "log").mockImplementation(() => undefined);

    emitRunStart(
      [
        { id: "model-a", samplesPerTest: 10 },
        { id: "model-b", samplesPerTest: 1 },
      ],
      ["counter", "effect"],
    );

    expect(output).toHaveBeenCalledOnce();
    expect(JSON.parse(String(output.mock.calls[0][0]))).toEqual({
      type: "run_start",
      models: [
        { id: "model-a", samplesPerTest: 10 },
        { id: "model-b", samplesPerTest: 1 },
      ],
      tests: ["counter", "effect"],
    });
  });
});
