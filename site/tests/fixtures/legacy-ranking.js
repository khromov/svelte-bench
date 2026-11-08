// @ts-nocheck
// Ranking calculation captured verbatim from views/index.ejs at 5288732327023915ac0b2ee1206113a8dd8f1c10.
// Retained only as an independent migration parity oracle.
export function legacyRanking(groupedResults, selectedFile = "merged") {
  // Local models are the ones served by Ollama; they get their own leaderboard tab
  const isLocalProvider = (provider) => provider.toLowerCase() === "ollama";

  // Check if this is the merged results file and calculate top models
  let topModelsList = [];
  if (selectedFile && selectedFile.includes("merged") && groupedResults.length > 0) {
    const modelScores = new Map();

    // Iterate through all providers and models
    groupedResults.forEach((providerData) => {
      Object.entries(providerData.models).forEach(([modelName, results]) => {
        // Calculate average pass@1 for this model
        let totalPass1 = 0;
        let testCount = 0;

        results.forEach((result) => {
          totalPass1 += result.pass1;
          testCount++;
        });

        if (testCount > 0) {
          const avgPass1 = totalPass1 / testCount;
          // Generation speed (tokens/second) is measured once per model and stored on every result
          const tpsResult = results.find((result) => typeof result.tps === "number" && result.tps > 0);
          // Average response size (output tokens) and the time estimate derived from it, merged in from
          // benchmarks/token-times-ollama/ by `pnpm merge`
          const tokenTimesResult = results.find((result) => result.tokenTimes && result.tokenTimes.sampleCount > 0);
          modelScores.set(`${providerData.provider}|${modelName}`, {
            provider: providerData.provider,
            model: modelName,
            modelUrl: results.find((result) => result.modelUrl)?.modelUrl,
            averagePass1: avgPass1,
            score: avgPass1 * 100, // Convert to percentage
            tps: tpsResult ? tpsResult.tps : null,
            tokenTimes: tokenTimesResult ? tokenTimesResult.tokenTimes : null,
          });
        }
      });
    });

    // Sort models by average pass@1 in descending order.
    // When two Ollama models tie on score, the faster one (higher tokens/second) ranks first.
    // Non-Ollama models keep their existing order.
    topModelsList = Array.from(modelScores.values()).sort((a, b) => {
      const scoreDiff = b.averagePass1 - a.averagePass1;
      if (Math.abs(scoreDiff) > 1e-9) return scoreDiff;
      const bothLocal = isLocalProvider(a.provider) && isLocalProvider(b.provider);
      if (bothLocal && a.tps !== null && b.tps !== null) return b.tps - a.tps;
      return 0;
    });
  }

  return topModelsList;
}

export function legacyV1Ranking(groupedResults, selectedFile = "merged") {
  let topModelsList = [];
  if (selectedFile && selectedFile.includes("merged") && groupedResults.length > 0) {
    const modelScores = new Map();

    // Iterate through all providers and models
    groupedResults.forEach((providerData) => {
      Object.entries(providerData.models).forEach(([modelName, results]) => {
        // Calculate average pass@1 for this model
        let totalPass1 = 0;
        let testCount = 0;

        results.forEach((result) => {
          totalPass1 += result.pass1;
          testCount++;
        });

        if (testCount > 0) {
          const avgPass1 = totalPass1 / testCount;
          modelScores.set(`${providerData.provider}|${modelName}`, {
            provider: providerData.provider,
            model: modelName,
            averagePass1: avgPass1,
            score: avgPass1 * 100, // Convert to percentage
          });
        }
      });
    });

    // Sort models by average pass@1 in descending order
    topModelsList = Array.from(modelScores.values()).sort((a, b) => b.averagePass1 - a.averagePass1);
  }

  return topModelsList;
}
