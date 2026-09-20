#!/usr/bin/env bash
# Benchmark one Ollama model end to end: full benchmark, tokens per second, output tokens per
# response, then rebuild the report. Host comes from OLLAMA_HOST in .env.
# Usage: pnpm ollama-test <model>   (any name shown by `ollama ls`, e.g. gemma4:e2b-it-q4_K_M)
set -euo pipefail
cd "$(dirname "$0")"

# pnpm may pass a literal "--" through
[ "${1:-}" = "--" ] && shift

if [ $# -ne 1 ]; then
  echo "Usage: pnpm ollama-test <model>   (e.g. pnpm ollama-test gemma4:e2b-it-q4_K_M)" >&2
  exit 1
fi
model="$1"

echo "=== [1/4] Benchmarking $model ==="
# Env vars take precedence over .env; empty DEBUG_TEST/DEBUG_SAMPLES force a full run.
DEBUG_MODE=true DEBUG_PROVIDER=ollama DEBUG_MODEL="$model" DEBUG_TEST= DEBUG_SAMPLES= pnpm run-tests

echo "=== [2/4] Measuring tokens per second ==="
pnpm ollama-tps -- --model "$model"

echo "=== [3/4] Measuring output tokens per response ==="
pnpm ollama-token-times -- --model "$model"

echo "=== [4/4] Rebuilding the report ==="
pnpm run build

echo "Done: $model is benchmarked and in the report."
