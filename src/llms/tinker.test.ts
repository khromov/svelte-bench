// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TinkerProvider } from "./tinker";
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
  vi.stubEnv("TM_TINKER_API_KEY", "test-key");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockResolvedValue(answer());
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Tinker provider", () => {
  it("preserves full sampler paths in provider shorthand", async () => {
    const path = "tinker://run-id:train:0/sampler_weights/000080";
    const provider = await getLLMProvider(`tinker:${path}`);
    await provider.generateCode("prompt");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe(path);
  });

  it("discovers and deduplicates model and serverless catalogs without sending credentials", async () => {
    fetchMock
      .mockReset()
      .mockResolvedValueOnce(jsonResponse([{ tinker_id: "model" }, { tinker_id: "" }]))
      .mockResolvedValueOnce(jsonResponse([{ tinker_id: "model" }, { tinker_id: "model:sampling-nvfp4" }]));
    expect(await new TinkerProvider("model").getModels()).toEqual(["model", "model:sampling-nvfp4"]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://tinker-docs.thinkingmachines.ai/tinker/models.json",
      "https://tinker-docs.thinkingmachines.ai/tinker/serverless.json",
    ]);
    for (const [, options] of fetchMock.mock.calls) expect(options.headers).toBeUndefined();
  });

  it.each([{}, [], [{ tinker_id: "" }]])("rejects malformed or empty catalogs: %j", async (data) => {
    fetchMock.mockImplementation(async () => jsonResponse(data));
    await expect(new TinkerProvider("model").getModels()).rejects.toThrow(/catalog/);
  });

  it("propagates catalog HTTP failures", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({}, 503));
    await expect(new TinkerProvider("model").getModels()).rejects.toThrow("status 503");
  });

  it("requires its own API key", () => {
    vi.stubEnv("TM_TINKER_API_KEY", "");
    expect(() => new TinkerProvider("test-model")).toThrow("TM_TINKER_API_KEY");
  });

  it("registers the provider and sends the documented endpoint, auth, and context", async () => {
    const provider = await getLLMProvider("tinker:thinkingmachines/Inkling:peft:262144");
    expect(provider.name).toBe("Thinking Machines Tinker");
    expect(provider.getModelIdentifier()).toBe("thinkingmachines/Inkling:peft:262144");
    expect(await provider.generateCode("make a component", 0, "Svelte docs")).toBe("<p>hello</p>");
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1/chat/completions");
    expect(new Headers(options.headers).get("Authorization")).toBe("Bearer test-key");
    expect(JSON.parse(options.body)).toEqual({
      model: "thinkingmachines/Inkling:peft:262144",
      max_tokens: 8192,
      separate_reasoning: true,
      temperature: 0,
      messages: [
        { role: "system", content: DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT },
        { role: "user", content: "Svelte docs" },
        { role: "user", content: "make a component" },
      ],
    });
  });

  it("allows custom model IDs and leaves sampling and reasoning defaults to the API", async () => {
    await new TinkerProvider("future-model").generateCode("prompt");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("future-model");
    expect(body.messages[0].content).toBe(DEFAULT_SYSTEM_PROMPT);
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("reasoning_effort");
  });

  it("reports reasoning budget exhaustion without returning reasoning as code", async () => {
    fetchMock.mockResolvedValue(answer(null, "length"));
    await expect(new TinkerProvider("test-model").generateCode("prompt")).rejects.toThrow(
      "budget exhausted during reasoning",
    );
  });

  it.each([400, 401, 402, 403, 404, 409, 429, 503])(
    "does not repeat permanent or server-forbidden failures (%s)",
    async (status) => {
      fetchMock.mockImplementation(async () =>
        jsonResponse({ error: { message: "request rejected", code: "test_error" } }, status, {
          "x-should-retry": "false",
        }),
      );
      await expect(withRetry(() => new TinkerProvider("test-model").generateCode("prompt"))).rejects.toMatchObject({
        name: "NonRetryableError",
        status,
      });
      expect(fetchMock).toHaveBeenCalledOnce();
    },
  );

  it("lets the SDK retry transient errors", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { message: "busy" } }, 503, { "retry-after-ms": "1" }));
    expect(await new TinkerProvider("test-model").generateCode("prompt")).toBe("<p>hello</p>");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
