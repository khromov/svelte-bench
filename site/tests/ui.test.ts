import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import App from "./App.svelte";
import { page } from "./state.svelte.js";
import type { Result } from "../src/lib/results.js";
const result: Result = {
  provider: "ollama",
  modelId: "local-test",
  testName: "counter",
  numSamples: 1,
  numCorrect: 1,
  pass1: 1,
  pass10: 1,
  samples: [
    {
      index: 0,
      code: "<script>window.evil=true</script><h1>escaped</h1>",
      success: true,
      errors: [],
      temperature: 0.1,
    },
  ],
};
const data = {
  legacy: false,
  selected: "benchmark-results-merged.json",
  files: ["benchmark-results-merged.json"],
  results: [result, { ...result, provider: "cloud", modelId: "remote-test" }],
};
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  });
  history.replaceState({}, "", "/svelte-bench/benchmark-results-merged.html");
  page.url = new URL(location.href);
  page.shallow = null;
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});
afterEach(cleanup);
test("restores URL filters, supports tabs and preserves the current search input", async () => {
  const user = userEvent.setup();
  page.url = new URL(`${location.origin}/svelte-bench/benchmark-results-merged.html?search=local&tab=local&sort=tps`);
  render(App, { data });
  const search = screen.getByRole("textbox", { name: "Search models and providers" });
  await waitFor(() => expect(search).toHaveValue("local"));
  expect(screen.getByRole("tab", { name: /Local models/ })).toHaveAttribute("aria-selected", "true");
  await user.click(screen.getByRole("button", { name: "Clear" }));
  await user.click(screen.getByRole("tab", { name: /All models/ }));
  await user.type(search, "remote");
  expect(search).toHaveFocus();
  await waitFor(() => expect(page.shallow?.url.searchParams.get("search")).toBe("remote"));
  expect(screen.getByRole("link", { name: "remote-test" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Download JSON/ })).toHaveAttribute(
    "href",
    "/svelte-bench/benchmark-results-merged.json",
  );
});
test("opens samples with keyboard, escapes generated code, closes with Escape, and persists theme", async () => {
  const user = userEvent.setup();
  render(App, { data });
  await user.click(screen.getByRole("button", { name: /ollama 1 models/ }));
  await user.click(screen.getByRole("button", { name: /local-test 100/ }));
  const trigger = screen.getByRole("button", { name: "Samples (1)" });
  trigger.focus();
  await user.keyboard("{Enter}");
  expect(await screen.findByRole("dialog")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /Sample 1 Passed/ }));
  expect(screen.getByText(result.samples[0].code)).toBeInTheDocument();
  expect(document.querySelector("h1")?.textContent).toBe("Model leaderboard");
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  await waitFor(() => expect(trigger).toHaveFocus());
  await user.click(screen.getByRole("button", { name: "Toggle theme" }));
  expect(localStorage.getItem("theme")).toBe("dark");
  expect(document.documentElement).toHaveClass("dark");
});
test("renders legacy warning and context without optional speed metadata", async () => {
  render(App, {
    data: {
      ...data,
      legacy: true,
      results: [{ ...result, context: { used: true, filename: "docs.txt", content: "<script>context</script>" } }],
    },
  });
  expect(screen.getByRole("note")).toHaveTextContent("Legacy v1 results");
  expect(screen.queryByRole("columnheader", { name: /Speed/ })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Context file: docs.txt" }));
  expect(screen.getByText("<script>context</script>")).toBeInTheDocument();
});

test("sort controls update the URL, preserve rank labels and restore navigation state", async () => {
  const user = userEvent.setup();
  const timing = {
    sampleCount: 1,
    avgOutputTokens: 20,
    avgPromptTokens: 10,
    avgEvalDurationNs: 1,
    avgResponseSeconds: 2,
    measuredAt: "",
    samples: [],
  };
  render(App, {
    data: {
      ...data,
      results: [
        { ...result, modelId: "slow", tps: 10, tokenTimes: { ...timing, avgResponseSeconds: 4 } },
        { ...result, modelId: "fast", tps: 20, tokenTimes: timing },
      ],
    },
  });
  await user.click(screen.getByRole("tab", { name: /Local models/ }));
  await user.click(screen.getByRole("button", { name: /Speed/ }));
  await waitFor(() => expect(page.shallow?.url.searchParams.get("sort")).toBe("tps"));
  await user.click(screen.getByRole("button", { name: /Speed/ }));
  await waitFor(() => expect(page.shallow?.url.searchParams.get("sort")).toBe("tps-asc"));
  const rows = screen.getAllByRole("row");
  expect(rows[1]).toHaveTextContent("slow");
  expect(rows[1].querySelector("td")?.textContent).toBe("2");
  page.url = new URL(`${location.origin}/svelte-bench/benchmark-results-merged.html?tab=local&sort=time`);
  page.shallow = null;
  await waitFor(() => expect(screen.getAllByRole("row")[1]).toHaveTextContent("fast"));
  await user.click(screen.getByRole("button", { name: /Score/ }));
  await waitFor(() => expect(page.shallow?.url.searchParams.has("sort")).toBe(false));
});

test("connects keyboard-operated tabs to their result panels", async () => {
  const user = userEvent.setup();
  render(App, { data });
  const all = screen.getByRole("tab", { name: /All models/ });
  all.focus();
  await user.keyboard("{ArrowRight}");
  const local = screen.getByRole("tab", { name: /Local models/ });
  await waitFor(() => expect(local).toHaveAttribute("aria-selected", "true"));
  const panel = screen.getByRole("tabpanel");
  expect(local).toHaveAttribute("aria-controls", panel.id);
  expect(panel).toHaveAttribute("aria-labelledby", local.id);
  await waitFor(() => expect(page.shallow?.url.searchParams.get("tab")).toBe("local"));
});

test.each([
  [false, ""],
  [false, "?tab=local"],
  [true, ""],
  [true, "?tab=local"],
] as const)(
  "restores old model anchors and opens their detailed results (legacy=%s, query=%s)",
  async (legacy, query) => {
    const modelId = "hf.co/webai-official/air-26B-A4B-GGUF:latest";
    const hash = "#model-ollama-hfcowebai-officialair-26b-a4b-gguflatest";
    const selected = `${legacy ? "v1-" : ""}benchmark-results-merged.json`;
    const pathname = `/svelte-bench/${legacy ? "v1/" : ""}${selected.replace(".json", ".html")}`;
    page.url = new URL(`${location.origin}${pathname}${query}${hash}`);
    render(App, {
      data: {
        ...data,
        legacy,
        selected,
        results: [
          { ...result, modelId, modelUrl: "https://huggingface.co/webai-official/air-26B-A4B-GGUF" },
          ...data.results,
        ],
      },
    });
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: query ? /Local models/ : /All models/ })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
    if (query) expect(screen.queryByRole("link", { name: "remote-test" })).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: modelId });
    expect(link).toHaveAttribute("href", hash);
    expect(screen.getByRole("link", { name: `Open model page for ${modelId}` })).toHaveAttribute("target", "_blank");
    const trigger = await screen.findByRole("button", { name: `${modelId} 100.0%` });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(hash.slice(1))).toContainElement(trigger);
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Samples (1)" })).toBeInTheDocument();
    // Hash navigation while mounted opens another model, including from shallow URL state.
    await userEvent.click(screen.getByRole("link", { name: "local-test" }));
    expect(page.url.hash).toBe("#model-ollama-local-test");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /local-test 100/ })).toHaveAttribute("aria-expanded", "true"),
    );
    await userEvent.click(screen.getByRole("tab", { name: /All models/ }));
    await waitFor(() => expect((page.shallow?.url ?? page.url).searchParams.has("tab")).toBe(false));
    expect((page.shallow?.url ?? page.url).hash).toBe("#model-ollama-local-test");
  },
);

test("ignores unknown model fragments without opening unrelated results", async () => {
  page.url = new URL(`${location.href}#model-missing`);
  render(App, { data });
  await waitFor(() => expect(screen.getByRole("link", { name: "local-test" })).toBeInTheDocument());
  expect(screen.getByRole("button", { name: /ollama 1 models/ })).toHaveAttribute("aria-expanded", "false");
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
});

test("reopens a collapsed model when its current anchor is clicked again", async () => {
  page.url = new URL(`${location.href}#model-ollama-local-test`);
  render(App, { data });
  const trigger = await screen.findByRole("button", { name: /local-test 100/ });
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  await userEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  await userEvent.click(screen.getByRole("link", { name: "local-test" }));
  await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));
});
