// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QwenProvider } from "./qwen";
import { getLLMProvider } from "./index";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT } from "../utils/prompt";
import { withRetry } from "../utils/retry-wrapper";

const fetchMock = vi.fn();
function jsonResponse(body: unknown, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}
function answer(text = "<p>hello</p>", status = "completed") {
  return jsonResponse({
    id: "resp_test",
    object: "response",
    status,
    incomplete_details: status === "incomplete" ? { reason: "max_output_tokens" } : null,
    output: [
      { type: "reasoning", summary: [{ type: "summary_text", text: "private reasoning" }] },
      { type: "message", role: "assistant", content: [{ type: "output_text", text, annotations: [] }] },
    ],
  });
}

beforeEach(() => {
  vi.stubEnv("QWEN_API_KEY", "test-key");
  vi.stubEnv("QWEN_BASE_URL", "");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockResolvedValue(answer());
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Qwen Responses provider", () => {
  it("requires its own API key", () => {
    vi.stubEnv("QWEN_API_KEY", "");
    expect(() => new QwenProvider()).toThrow("QWEN_API_KEY");
  });

  it("registers Qwen and sends Responses input, context, and bearer auth to US East", async () => {
    const provider = await getLLMProvider("qwen:qwen4-max");
    expect(provider.name).toBe("Qwen");
    expect(provider.getModelIdentifier()).toBe("qwen4-max");
    expect(provider.getModels()).toContain("qwen4-max");
    expect(await provider.generateCode("make a component", 0, "Svelte docs")).toBe("<p>hello</p>");
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://us-east-1.maas.qwencloudapi.com/compatible-mode/v1/responses");
    expect(new Headers(options.headers).get("Authorization")).toBe("Bearer test-key");
    expect(JSON.parse(options.body)).toEqual({
      model: "qwen4-max",
      store: false,
      temperature: 0,
      input: [
        { role: "system", content: DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT },
        { role: "user", content: "Svelte docs" },
        { role: "user", content: "make a component" },
      ],
    });
  });

  it("supports another regional endpoint and custom model IDs with API defaults", async () => {
    vi.stubEnv("QWEN_BASE_URL", "https://eu-central-1.maas.qwencloudapi.com/compatible-mode/v1/");
    await new QwenProvider("custom-model").generateCode("prompt");
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://eu-central-1.maas.qwencloudapi.com/compatible-mode/v1/responses");
    expect(JSON.parse(options.body)).toEqual({
      model: "custom-model",
      store: false,
      input: [
        { role: "system", content: DEFAULT_SYSTEM_PROMPT },
        { role: "user", content: "prompt" },
      ],
    });
  });

  it.each([
    ["", "completed"],
    ["partial code", "incomplete"],
    ["", "failed"],
  ])("rejects empty or unfinished answers (%s, %s)", async (text, status) => {
    fetchMock.mockResolvedValue(answer(text, status));
    await expect(withRetry(() => new QwenProvider().generateCode("prompt"))).rejects.toMatchObject({
      name: "NonRetryableError",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([400, 401, 402, 403, 404])("does not repeat permanent failures (%s)", async (status) => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { message: "request rejected" } }, status));
    await expect(withRetry(() => new QwenProvider().generateCode("prompt"))).rejects.toMatchObject({
      name: "NonRetryableError",
      status,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("honors server-forbidden retries", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { message: "do not retry" } }, 503, { "x-should-retry": "false" }),
    );
    await expect(withRetry(() => new QwenProvider().generateCode("prompt"))).rejects.toMatchObject({
      name: "NonRetryableError",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("lets the SDK retry transient errors", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { message: "busy" } }, 503, { "retry-after-ms": "1" }));
    expect(await new QwenProvider().generateCode("prompt")).toBe("<p>hello</p>");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
