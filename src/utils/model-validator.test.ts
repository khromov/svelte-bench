import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateModels } from "./model-validator";

const { generateCode } = vi.hoisted(() => ({ generateCode: vi.fn() }));
vi.mock("../llms", () => ({ getLLMProvider: vi.fn(async () => ({ generateCode })) }));

beforeEach(() => {
  generateCode.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("model validation diagnostics", () => {
  it("preserves credit failures instead of declaring the model invalid", async () => {
    const error = Object.assign(new Error("OpenRouter HTTP 402: Add credits or use a funded key"), { status: 402 });
    generateCode.mockRejectedValue(error);
    await expect(validateModels("openrouter", ["stepfun/step-5-preview"])).rejects.toBe(error);
  });

  it("keeps a genuinely unavailable model out of the valid list", async () => {
    generateCode.mockRejectedValue(Object.assign(new Error("model not found"), { status: 404 }));
    expect(await validateModels("openrouter", ["missing-model"])).toEqual([]);
  });

  it("still runs valid models when another model has a validation error", async () => {
    generateCode.mockRejectedValueOnce(new Error("connection failed")).mockResolvedValueOnce("test");
    expect(await validateModels("openrouter", ["unreachable", "working"])).toEqual(["working"]);
  });
});
