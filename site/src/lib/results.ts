import type { HumanEvalResult } from "../../../src/utils/humaneval.js";
export type Result = HumanEvalResult;
export const isLocal = (provider: string) => provider.toLowerCase() === "ollama";
// Keep the IDs published by the EJS renderer: existing inbound links depend on them.
export function modelAnchor(provider: string, model: string) {
  const slug = (value: string) =>
    value
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "")
      .toLowerCase();
  return `model-${slug(provider)}-${slug(model)}`;
}
export function models(results: Result[], legacy = false) {
  const groups = new Map<string, Result[]>();
  // Match the original renderer's alphabetical provider/model insertion order before ranking.
  for (const result of [...results].sort(
    (a, b) => a.provider.localeCompare(b.provider) || a.modelId.localeCompare(b.modelId),
  )) {
    const key = `${result.provider}|${result.modelId}`;
    groups.set(key, [...(groups.get(key) ?? []), result]);
  }
  return [...groups]
    .map(([key, tests]) => ({
      key,
      provider: tests[0].provider,
      model: tests[0].modelId,
      tests,
      modelUrl: tests.find((r) => r.modelUrl)?.modelUrl,
      averagePass1: tests.reduce((sum, r) => sum + r.pass1, 0) / tests.length,
      score: (tests.reduce((sum, r) => sum + r.pass1, 0) / tests.length) * 100,
      tps: tests.find((r) => typeof r.tps === "number" && r.tps > 0)?.tps ?? null,
      tokenTimes: tests.find((r) => r.tokenTimes && r.tokenTimes.sampleCount > 0)?.tokenTimes ?? null,
    }))
    .sort((a, b) => {
      const diff = b.averagePass1 - a.averagePass1;
      if (legacy || Math.abs(diff) > 1e-9) return diff;
      return isLocal(a.provider) && isLocal(b.provider) && a.tps !== null && b.tps !== null ? b.tps - a.tps : 0;
    })
    .map((model, i) => ({ ...model, rank: i + 1 }));
}
export type Model = ReturnType<typeof models>[number];
export function formatDuration(seconds: number) {
  if (seconds < 10) return `${seconds.toFixed(1)}s`;
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60),
    rest = total % 60;
  if (minutes < 60) return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}
export const formatTps = (tps: number) => (tps >= 100 ? Math.round(tps).toString() : tps.toFixed(1));
export function responseTitle(model: Model) {
  const t = model.tokenTimes;
  return t
    ? `${Math.round(t.avgOutputTokens).toLocaleString("en-US")} output tokens per response on average, thinking included (${t.sampleCount} samples, one per test)${model.tps ? ` at ${formatTps(model.tps)} tok/s` : "; no speed measurement, so no time estimate"}`
    : "Not measured";
}
export function visibleModels(all: Model[], search: string, tab: string, sort: string) {
  const query = search.toLowerCase().trim();
  const filtered = all.filter(
    (m) => (tab !== "local" || isLocal(m.provider)) && `${m.provider} ${m.model}`.toLowerCase().includes(query),
  );
  if (!/^(rank|model|score|tps|time)(-asc|-desc)?$/.test(sort)) return filtered;
  const [key] = sort.split("-");
  // Default score order retains the published ranking and local speed tie-breaker.
  if (sort === "score" || sort === "score-desc") return filtered;
  return filtered.sort((a, b) => {
    const av =
      key === "model"
        ? a.model
        : key === "rank"
          ? a.rank
          : key === "score"
            ? a.score
            : key === "tps"
              ? a.tps
              : a.tokenTimes?.avgResponseSeconds;
    const bv =
      key === "model"
        ? b.model
        : key === "rank"
          ? b.rank
          : key === "score"
            ? b.score
            : key === "tps"
              ? b.tps
              : b.tokenTimes?.avgResponseSeconds;
    return compareValues(av, bv, sort) || a.rank - b.rank;
  });
}
export function sortDirection(sort: string) {
  const [key, explicit] = sort.split("-");
  return explicit ?? (["rank", "model", "test", "time", "cost"].includes(key) ? "asc" : "desc");
}
export function nextSort(current: string, key: string) {
  return current.split("-")[0] === key ? `${key}-${sortDirection(current) === "asc" ? "desc" : "asc"}` : key;
}
export function compareValues(
  a: number | string | null | undefined,
  b: number | string | null | undefined,
  sort: string,
) {
  if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1;
  const value =
    typeof a === "string" && typeof b === "string"
      ? a.localeCompare(b, "en", { numeric: true })
      : Number(a) - Number(b);
  return sortDirection(sort) === "asc" ? value : -value;
}
export function sortResults(results: Result[], sort: string) {
  const key = sort.split("-")[0];
  const value = (r: Result) =>
    key === "correct"
      ? r.numCorrect
      : key === "pass1"
        ? r.pass1
        : key === "pass10"
          ? r.pass10
          : key === "samples"
            ? r.numSamples
            : r.testName;
  return [...results].sort((a, b) => compareValues(value(a), value(b), sort) || a.testName.localeCompare(b.testName));
}
