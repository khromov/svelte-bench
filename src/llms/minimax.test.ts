// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MiniMaxProvider } from "./minimax";
import { getLLMProvider } from "./index";
import { DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT } from "../utils/prompt";

const fetchMock = vi.fn();
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const answer = () =>
  jsonResponse({
    choices: [{ message: { content: "<p>hello</p>", reasoning_content: "private reasoning" }, finish_reason: "stop" }],
    base_resp: { status_code: 0 },
  });

beforeEach(() => {
  vi.stubEnv("MINIMAX_API_KEY", "test-key");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockImplementation(async () => answer());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("MiniMax provider", () => {
  it("requires its own API key", () => {
    vi.stubEnv("MINIMAX_API_KEY", "");
    expect(() => new MiniMaxProvider()).toThrow("MINIMAX_API_KEY");
  });

  it("routes custom models and sends authentication, context, and zero temperature", async () => {
    const provider = await getLLMProvider("minimax:custom-model");
    expect(provider.name).toBe("MiniMax");
    expect(provider.getModelIdentifier()).toBe("custom-model");
    expect(await provider.generateCode("make a component", 0, "Svelte docs")).toBe("<p>hello</p>");
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.minimax.io/v1/chat/completions");
    expect(options.headers.Authorization).toBe("Bearer test-key");
    expect(JSON.parse(options.body)).toEqual({
      model: "custom-model",
      max_completion_tokens: 8192,
      stream: false,
      reasoning_split: true,
      temperature: 0,
      messages: [
        { role: "system", content: DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT },
        { role: "user", content: "Svelte docs" },
        { role: "user", content: "make a component" },
      ],
    });
  });

  it("defaults to a documented model and omits unspecified temperature", async () => {
    const provider = new MiniMaxProvider();
    expect(provider.getModelIdentifier()).toBe("MiniMax-M3.1-Flash");
    await provider.generateCode("prompt");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("temperature");
  });

  it.each([400, 401, 402, 403, 404])("fails without retrying HTTP %s", async (status) => {
    fetchMock.mockImplementation(async () => jsonResponse({ error: { message: "rejected" } }, status));
    await expect(new MiniMaxProvider().generateCode("prompt")).rejects.toMatchObject({ name: "NonRetryableError" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([1004, 1008, 1026, 1027, 2013, 2049, 2056])(
    "fails without retrying application error %s",
    async (status_code) => {
      fetchMock.mockImplementation(async () => jsonResponse({ base_resp: { status_code, status_msg: "rejected" } }));
      await expect(new MiniMaxProvider().generateCode("prompt")).rejects.toMatchObject({ name: "NonRetryableError" });
      expect(fetchMock).toHaveBeenCalledOnce();
    },
  );

  it.each([null, "", "  "])("rejects empty code without returning reasoning (%s)", async (content) => {
    fetchMock.mockImplementation(async () =>
      jsonResponse({ choices: [{ message: { content, reasoning_content: "reasoning" }, finish_reason: "length" }] }),
    );
    await expect(new MiniMaxProvider().generateCode("prompt")).rejects.toThrow("budget exhausted during reasoning");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([429, 503, 1002, 1024])("retries transient error %s", async (code) => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(
      code < 1000
        ? jsonResponse({ error: { message: "busy" } }, code)
        : jsonResponse({ base_resp: { status_code: code, status_msg: "rate limit or internal error" } }),
    );
    const result = new MiniMaxProvider().generateCode("prompt");
    await vi.runAllTimersAsync();
    expect(await result).toBe("<p>hello</p>");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
