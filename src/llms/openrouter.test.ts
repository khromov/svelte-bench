import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenRouterProvider } from "./openrouter";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create } };
  },
}));

beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", "test-key");
  vi.stubEnv("OPENROUTER_PROVIDER", "auto");
  vi.stubEnv("OPENROUTER_MAX_COMPLETION_TOKENS", "");
  create.mockReset();
  create.mockResolvedValue({ choices: [{ message: { content: "<p>ok</p>" } }] });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("OpenRouter output budget", () => {
  it("bounds requests instead of reserving the model's full output window", async () => {
    await new OpenRouterProvider("stepfun/step-5-preview").generateCode("test", 0.1);
    expect(create.mock.calls[0][0]).toMatchObject({ max_completion_tokens: 8192, temperature: 0.1 });
  });

  it("preserves a configured budget during precision fallback", async () => {
    vi.stubEnv("OPENROUTER_MAX_COMPLETION_TOKENS", "4096");
    create.mockRejectedValueOnce(Object.assign(new Error("No providers match precision"), { status: 404 }));
    await new OpenRouterProvider().generateCode("test");
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][0].max_completion_tokens).toBe(4096);
    expect(create.mock.calls[1][0].provider).toBeUndefined();
  });

  it("does not retry credit errors as precision failures", async () => {
    create.mockRejectedValue(
      Object.assign(new Error("402 insufficient credits; provider unavailable"), { status: 402 }),
    );
    await expect(new OpenRouterProvider().generateCode("test")).rejects.toThrow("402 insufficient credits");
    expect(create).toHaveBeenCalledOnce();
  });

  it.each(["0", "-1", "bad", "1.5"])("rejects invalid token budgets: %s", (value) => {
    vi.stubEnv("OPENROUTER_MAX_COMPLETION_TOKENS", value);
    expect(() => new OpenRouterProvider()).toThrow("must be a positive integer");
  });
});
