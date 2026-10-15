// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReflectionProvider } from "./reflection";
import { getLLMProvider } from "./index";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT } from "../utils/prompt";
import { withRetry } from "../utils/retry-wrapper";

const fetchMock = vi.fn();
function jsonResponse(body: unknown, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}
function answer(content: string | null = "<p>hello</p>", finish_reason = "stop") {
  return jsonResponse({ choices: [{ message: { content, reasoning_content: "private reasoning" }, finish_reason }] });
}

beforeEach(() => {
  vi.stubEnv("REFLECTION_API_KEY", "test-key");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockResolvedValue(answer());
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Reflection provider", () => {
  it("requires its own API key", () => {
    vi.stubEnv("REFLECTION_API_KEY", "");
    expect(() => new ReflectionProvider()).toThrow("REFLECTION_API_KEY");
  });

  it("registers the provider and sends the documented endpoint, auth, and context", async () => {
    const provider = await getLLMProvider("reflection:Beam-1.0-501B-A23B");
    expect(provider.name).toBe("Reflection");
    expect(provider.getModelIdentifier()).toBe("Beam-1.0-501B-A23B");
    expect(provider.getModels()).toContain("Beam-1.0-501B-A23B");
    expect(await provider.generateCode("make a component", 0, "Svelte docs")).toBe("<p>hello</p>");
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.reflection.ai/openai/v1/chat/completions");
    expect(new Headers(options.headers).get("Authorization")).toBe("Bearer test-key");
    expect(JSON.parse(options.body)).toEqual({
      model: "Beam-1.0-501B-A23B",
      max_completion_tokens: 8192,
      temperature: 0,
      messages: [
        { role: "system", content: DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT },
        { role: "user", content: "Svelte docs" },
        { role: "user", content: "make a component" },
      ],
    });
  });

  it("allows custom model IDs and leaves sampling and reasoning defaults to the API", async () => {
    await new ReflectionProvider("future-model").generateCode("prompt");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("future-model");
    expect(body.messages[0].content).toBe(DEFAULT_SYSTEM_PROMPT);
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("reasoning_effort");
  });

  it("reports reasoning budget exhaustion without returning reasoning as code", async () => {
    fetchMock.mockResolvedValue(answer(null, "length"));
    await expect(new ReflectionProvider().generateCode("prompt")).rejects.toThrow("budget exhausted during reasoning");
  });

  it.each([400, 401, 402, 403, 404, 409, 429, 503])(
    "does not repeat permanent or server-forbidden failures (%s)",
    async (status) => {
      fetchMock.mockImplementation(async () =>
        jsonResponse({ error: { message: "request rejected", code: "test_error" } }, status, {
          "x-should-retry": "false",
        }),
      );
      await expect(withRetry(() => new ReflectionProvider().generateCode("prompt"))).rejects.toMatchObject({
        name: "NonRetryableError",
        status,
      });
      expect(fetchMock).toHaveBeenCalledOnce();
    },
  );

  it("lets the SDK retry transient errors", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { message: "busy" } }, 503, { "retry-after-ms": "1" }));
    expect(await new ReflectionProvider().generateCode("prompt")).toBe("<p>hello</p>");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
