import type { Result } from "./results.js";

export function summarizeCost(results: Pick<Result, "provider" | "samples">[]) {
  const local = results.every((r) => r.provider.toLowerCase() === "ollama");
  const samples = results.flatMap((r) => r.samples ?? []);
  const requests = samples.flatMap((s) => s.apiUsage ?? []);
  const missingSamples = samples.filter((s) => !s.apiUsage?.length).length;
  const valid = requests.filter(
    (r) =>
      (r.cost.source === "api" || r.cost.source === "estimate") &&
      typeof r.cost.usd === "number" &&
      Number.isFinite(r.cost.usd) &&
      r.cost.usd >= 0,
  );
  const apiUsd = valid.filter((r) => r.cost.source === "api").reduce((n, r) => n + r.cost.usd!, 0);
  const estimatedUsd = valid.filter((r) => r.cost.source === "estimate").reduce((n, r) => n + r.cost.usd!, 0);
  const complete = samples.length > 0 && !missingSamples && valid.length === requests.length;
  const tokenTotal = (key: "inputTokens" | "outputTokens") =>
    requests.length &&
    !missingSamples &&
    requests.every((r) => typeof r[key] === "number" && Number.isSafeInteger(r[key]) && r[key]! >= 0)
      ? requests.reduce((n, r) => n + r[key]!, 0)
      : null;
  return {
    local,
    requests: requests.length,
    samples: samples.length,
    recordedSamples: samples.length - missingSamples,
    knownUsd: apiUsd + estimatedUsd,
    apiUsd,
    estimatedUsd,
    apiRequests: valid.filter((r) => r.cost.source === "api").length,
    estimatedRequests: valid.filter((r) => r.cost.source === "estimate").length,
    status: local
      ? "local"
      : complete
        ? "complete"
        : valid.length
          ? "partial"
          : requests.length
            ? "unavailable"
            : "missing",
    inputTokens: tokenTotal("inputTokens"),
    outputTokens: tokenTotal("outputTokens"),
  };
}
export type CostSummary = ReturnType<typeof summarizeCost>;
export function formatUsd(usd: number) {
  if (usd > 0 && usd < 0.0001) return "<$0.0001";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(usd);
}
export function costSource(cost: CostSummary) {
  return cost.apiRequests && cost.estimatedRequests
    ? "API + estimate"
    : cost.estimatedRequests
      ? "Estimated"
      : "API reported";
}
