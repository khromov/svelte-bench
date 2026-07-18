import fs from "node:fs/promises";
import { afterEach, describe, expect, test, vi } from "vitest";

const { prompt } = vi.hoisted(() => ({
  prompt: vi.fn(),
}));

vi.mock("@cursor/sdk", () => ({
  Agent: { prompt },
}));

import { CursorProvider } from "./cursor";

const originalApiKey = process.env.CURSOR_API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.CURSOR_API_KEY;
  } else {
    process.env.CURSOR_API_KEY = originalApiKey;
  }
  prompt.mockReset();
});

describe("CursorProvider", () => {
  test("passes CURSOR_API_KEY directly to the Cursor SDK", async () => {
    process.env.CURSOR_API_KEY = "crsr_test_key";
    prompt.mockImplementation(async (_message, options) => {
      await fs.writeFile(`${options.local.cwd}/Component.svelte`, "<p>Generated</p>");
      return { status: "completed" };
    });

    const provider = new CursorProvider("composer-2");

    await expect(provider.generateCode("Generate a component")).resolves.toBe("<p>Generated</p>");
    expect(prompt).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        apiKey: "crsr_test_key",
        model: { id: "composer-2" },
      }),
    );
  });
});
