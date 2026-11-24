// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { validateModel } from "../utils/model-validator";
import { getLLMProvider } from "./index";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it.each([
  ["zai-coding", "https://api.z.ai/api/coding/paas/v4/chat/completions", "coding-key"],
  ["zai", "https://open.bigmodel.cn/api/paas/v4/chat/completions", "standard-key"],
])("validates GLM-5.4 through the selected %s provider", async (provider, endpoint, key) => {
  vi.stubEnv("Z_AI_API_KEY", "standard-key");
  vi.stubEnv("Z_AI_CODING_API_KEY", "coding-key");
  const fetchMock = vi.fn(async (_url: string, _request: RequestInit) =>
    Response.json({ choices: [{ message: { content: "test" } }] }),
  );
  vi.stubGlobal("fetch", fetchMock);

  expect(await validateModel(provider, "glm-5.4")).toBe(true);
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
    endpoint,
    expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Authorization: `Bearer ${key}` }) }),
  );
  expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toMatchObject({ model: "glm-5.4", temperature: 0.1 });
});

it("requires an explicitly configured Coding Plan key", async () => {
  vi.stubEnv("Z_AI_API_KEY", "standard-key");
  vi.stubEnv("Z_AI_CODING_API_KEY", "");
  await expect(getLLMProvider("zai-coding:glm-5.4")).rejects.toThrow("Z_AI_CODING_API_KEY");
});
