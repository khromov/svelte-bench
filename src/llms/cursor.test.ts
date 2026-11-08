import fs from "node:fs/promises";
import { afterEach, describe, expect, test, vi } from "vitest";
import { captureApiUsage, type ApiUsage } from "../utils/api-cost";
const { create, send, getUsage, close } = vi.hoisted(() => ({
  create: vi.fn(),
  send: vi.fn(),
  getUsage: vi.fn(),
  close: vi.fn(),
}));
vi.mock("@cursor/sdk", () => ({ Agent: { create } }));
vi.mock("node:fs", async (original) => ({
  ...(await original<typeof import("node:fs")>()),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn(),
}));
import { CursorProvider } from "./cursor";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("CursorProvider", () => {
  async function generate(billingFails = false) {
    vi.stubEnv("CURSOR_API_KEY", "crsr_test_key");
    const usage = { inputTokens: 100, outputTokens: 20, cacheReadTokens: 30, cacheWriteTokens: 10, totalTokens: 120 };
    create.mockImplementation(async (options) => {
      await fs.writeFile(`${options.local.cwd}/Component.svelte`, "<p>Generated</p>");
      return { send, getUsage, close };
    });
    send.mockResolvedValue({ wait: async () => ({ id: "run-1", status: "finished", usage }) });
    if (billingFails) getUsage.mockRejectedValue(new Error("billing pending"));
    else getUsage.mockResolvedValue({ usage, cost: { chargedCents: 1.5, rawCostCents: 2 }, runs: [] });
    const requests: ApiUsage[] = [];
    const code = await captureApiUsage(requests, "counter", 0, () =>
      new CursorProvider("composer-2").generateCode("Generate a component"),
    );
    return { code, requests };
  }
  test("captures actual charged cents from a fresh agent and closes it", async () => {
    const { code, requests } = await generate();
    expect(code).toBe("<p>Generated</p>");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "crsr_test_key", model: { id: "composer-2" } }),
    );
    expect(requests[0]).toMatchObject({ inputTokens: 100, outputTokens: 20, cost: { source: "api", usd: 0.015 } });
    expect(close).toHaveBeenCalledOnce();
  });
  test("billing lookup failure preserves generated code and token usage", async () => {
    const { code, requests } = await generate(true);
    expect(code).toBe("<p>Generated</p>");
    expect(requests[0].outputTokens).toBe(20);
    expect(requests[0].cost.usd).toBeNull();
    expect(close).toHaveBeenCalledOnce();
  });
});
