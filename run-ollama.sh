#!/usr/bin/env bash
# Run the full benchmark (all tests, 10 samples) for each Ollama model, one at a time.
# Host comes from OLLAMA_HOST in .env. A failed model is logged and skipped.
set -uo pipefail
cd "$(dirname "$0")"

MODELS=(
  #"gemma4:26b-a4b-it-q4_K_M"
  #"gpt-oss:20b"
  #"llama3.1:8b-instruct-q4_K_M"
  "muse-glimmer:30b-q4_K_M"
  "nemotron-3.5-lightning:30b-a3b-q4_K_M"
  "gemma4:31b-it-q4_K_M"
  "laguna-xs-2.1:q4_K_M"
  "north-mini-code-1.0:q4_K_M"
  "llama3.3:70b-instruct-q2_K"
  "nemotron-3.5-lightning:30b-8k"
  "mistral-nemo:12b-instruct-2407-q4_K_M"
  "granite4.2:30b-q4_K_M"
  "wcamaralopes/bonsai-27b-Q4_K_M:latest"
  "wcamaralopes/bonsai-27b-Q4_K_M-fix:latest"
  "qwen3.6:35b-a3b-q4_K_M"
  "qwen3.8:27b-mtp-q4_K_M"
)

mkdir -p logs
failed=()

for model in "${MODELS[@]}"; do
  echo "=== $(date '+%F %T') Starting $model ==="
  # Env vars take precedence over .env; empty DEBUG_TEST/DEBUG_SAMPLES force a full run.
  if DEBUG_MODE=true DEBUG_PROVIDER=ollama DEBUG_MODEL="$model" DEBUG_TEST= DEBUG_SAMPLES= \
    pnpm run-tests 2>&1 | tee "logs/ollama-${model//[\/:]/_}.log"; then
    echo "=== $(date '+%F %T') Finished $model ==="
  else
    echo "=== $(date '+%F %T') FAILED $model ==="
    failed+=("$model")
  fi
done

pnpm build

if [ ${#failed[@]} -gt 0 ]; then
  echo "Failed models:"
  printf '  %s\n' "${failed[@]}"
  exit 1
fi
echo "All models done."
