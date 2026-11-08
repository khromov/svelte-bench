import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, test } from "vitest";
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
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  });
  history.replaceState({}, "", "/svelte-bench/benchmark-results-merged.html");
  page.url = new URL(location.href);
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
  await waitFor(() => expect(page.url.searchParams.get("search")).toBe("remote"));
  expect(screen.getByText("remote-test", { selector: "a, span.font-medium" })).toBeInTheDocument();
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
  await waitFor(() => expect(page.url.searchParams.get("sort")).toBe("tps"));
  await user.click(screen.getByRole("button", { name: /Speed/ }));
  await waitFor(() => expect(page.url.searchParams.get("sort")).toBe("tps-asc"));
  const rows = screen.getAllByRole("row");
  expect(rows[1]).toHaveTextContent("slow");
  expect(rows[1].querySelector("td")?.textContent).toBe("2");
  page.url = new URL(`${location.origin}/svelte-bench/benchmark-results-merged.html?tab=local&sort=time`);
  await waitFor(() => expect(screen.getAllByRole("row")[1]).toHaveTextContent("fast"));
  await user.click(screen.getByRole("button", { name: /Score/ }));
  await waitFor(() => expect(page.url.searchParams.has("sort")).toBe(false));
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
  await waitFor(() => expect(page.url.searchParams.get("tab")).toBe("local"));
});
