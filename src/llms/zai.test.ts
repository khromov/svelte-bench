// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { validateModel } from "../utils/model-validator";
import { getLLMProvider } from "./index";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("reports startup overload retries and stops after three Coding Plan requests", async () => {
  vi.useFakeTimers();
  vi.stubEnv("Z_AI_API_KEY", "shared-key");
  vi.stubEnv("TUI_MODE", "true");
  const output = vi.spyOn(console, "log").mockImplementation(() => {});
  const fetchMock = vi.fn(async () =>
    Response.json({ error: { code: "1305", message: "The service is temporarily overloaded" } }, { status: 429 }),
  );
  vi.stubGlobal("fetch", fetchMock);

  const failure = expect(validateModel("zai-coding", "glm-5.4")).rejects.toThrow("API HTTP 429");
  await vi.waitFor(() => expect(output).toHaveBeenCalledWith(expect.stringContaining('"type":"rate_limit"')));
  await vi.runAllTimersAsync();
  await failure;

  expect(fetchMock).toHaveBeenCalledTimes(3);
  const events = output.mock.calls
    .map(([line]) => line)
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line));
  expect(events).toEqual([
    expect.objectContaining({ type: "rate_limit", retryAttempt: 1, error: expect.stringContaining("overloaded") }),
    expect.objectContaining({ type: "rate_limit", retryAttempt: 2, error: expect.stringContaining("overloaded") }),
    expect.objectContaining({ type: "provider_error", error: expect.stringContaining("API HTTP 429") }),
  ]);
});

it.each([
  ["zai-coding", "https://api.z.ai/api/coding/paas/v4/chat/completions"],
  ["zai", "https://open.bigmodel.cn/api/paas/v4/chat/completions"],
])("validates GLM-5.4 through the selected %s provider with the shared key", async (provider, endpoint) => {
  vi.stubEnv("Z_AI_API_KEY", "shared-key");
  const fetchMock = vi.fn(async (_url: string, _request: RequestInit) =>
    Response.json({ choices: [{ message: { content: "test" } }] }),
  );
  vi.stubGlobal("fetch", fetchMock);

  expect(await validateModel(provider, "glm-5.4")).toBe(true);
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
    endpoint,
    expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer shared-key" }),
    }),
  );
  expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toMatchObject({ model: "glm-5.4", temperature: 0.1 });
});

it("requires the shared Z.ai key for Coding Plan", async () => {
  vi.stubEnv("Z_AI_API_KEY", "");
  await expect(getLLMProvider("zai-coding:glm-5.4")).rejects.toThrow("Z_AI_API_KEY");
});
