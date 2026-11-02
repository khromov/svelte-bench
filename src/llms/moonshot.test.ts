// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MoonshotProvider } from "./moonshot";
import { validateModels } from "../utils/model-validator";

const fetchMock = vi.fn();
const answer = () => new Response(JSON.stringify({ choices: [{ message: { content: "<p>hello</p>" } }] }));

beforeEach(() => {
  vi.stubEnv("MOONSHOT_API_KEY", "test-key");
  vi.stubEnv("TEMPERATURE_OVERRIDE", "");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockImplementation(async () => answer());
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Moonshot startup", () => {
  it.each([
    "kimi-k2.5",
    "kimi-k2.6",
    "kimi-k2.7-code",
    "kimi-k2.7-code-highspeed",
    "kimi-k3",
    "kimi-k3.1-pro",
    "kimi-k3.1-pro-highspeed",
  ])("validates %s without sending unsupported sampling parameters", async (model) => {
    expect(await validateModels("moonshot", [model])).toEqual([model]);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.moonshot.ai/v1/chat/completions");
    expect(options.headers.Authorization).toBe("Bearer test-key");
    expect(JSON.parse(options.body)).not.toHaveProperty("temperature");
  });

  it("ignores temperature overrides for fixed-temperature models", async () => {
    vi.stubEnv("TEMPERATURE_OVERRIDE", "0.2");
    await new MoonshotProvider("kimi-k3.1-pro").generateCode("prompt");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("temperature");
  });

  it("preserves configurable temperature for older models", async () => {
    await new MoonshotProvider("moonshot-v1-8k").generateCode("prompt", 0.1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).temperature).toBe(0.1);
  });

  it.each([400, 401, 402, 403, 404])(
    "preserves HTTP %s diagnostics during validation without exiting",
    async (status) => {
      const exit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("unexpected process exit");
      });
      fetchMock.mockImplementation(
        async () => new Response(JSON.stringify({ error: { message: "API rejection detail" } }), { status }),
      );
      await expect(validateModels("moonshot", ["kimi-k3.1-pro"])).rejects.toThrow(
        `Moonshot API request failed: ${status}`,
      );
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(exit).not.toHaveBeenCalled();
    },
  );

  it("retains retry behavior for temporary failures", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(new Response("busy", { status: 503 }));
    const result = new MoonshotProvider("kimi-k3.1-pro").generateCode("prompt");
    await vi.runAllTimersAsync();
    expect(await result).toBe("<p>hello</p>");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
