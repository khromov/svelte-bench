import { expect, test } from "vitest";
import { load } from "../src/routes/[...path]/+page.server.js";

test.each([
  ["", false, "benchmark-results-merged.json"],
  ["index.html", false, "benchmark-results-merged.json"],
  ["v1", true, "v1-benchmark-results-merged.json"],
  ["v1/index.html", true, "v1-benchmark-results-merged.json"],
  ["benchmark-results-merged.html", false, "benchmark-results-merged.json"],
] as const)("opens the leaderboard at %s", async (path, legacy, selected) => {
  const result = await load({ params: { path } } as Parameters<typeof load>[0]);
  expect(result).toMatchObject({
    legacy,
    selected,
    results: expect.arrayContaining([expect.objectContaining({ modelId: expect.any(String) })]),
  });
});

test("preserves 404 behavior for unknown result URLs", async () => {
  await expect(load({ params: { path: "missing.html" } } as Parameters<typeof load>[0])).rejects.toMatchObject({
    status: 404,
  });
});
