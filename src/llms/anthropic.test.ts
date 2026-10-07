import { afterEach, describe, expect, test, vi } from "vitest";

const { create } = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  Anthropic: class {
    messages = { create };
  },
}));

import { AnthropicProvider } from "./anthropic";

const originalApiKey = process.env.ANTHROPIC_API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.ANTHROPIC_API_KEY;
  } else {
    process.env.ANTHROPIC_API_KEY = originalApiKey;
  }
  create.mockReset();
});

describe("AnthropicProvider temperature", () => {
  test.each(["claude-opus-5", "claude-opus-5-20260929", "claude-sonnet-5", "claude-sonnet-5-5", "claude-haiku-5-5"])(
    "omits temperature for %s",
    async (model) => {
      process.env.ANTHROPIC_API_KEY = "test-key";
      create.mockResolvedValue({ content: [{ type: "text", text: "<p>Generated</p>" }] });

      await new AnthropicProvider(model).generateCode("Generate a component", 0.1);

      expect(create).toHaveBeenCalledWith(expect.objectContaining({ model }));
      expect(create.mock.calls[0][0]).not.toHaveProperty("temperature");
    },
  );

  test("keeps temperature for older Sonnet models", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    create.mockResolvedValue({ content: [{ type: "text", text: "<p>Generated</p>" }] });

    await new AnthropicProvider("claude-sonnet-4-5").generateCode("Generate a component", 0.1);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ temperature: 0.1 }));
  });
});
