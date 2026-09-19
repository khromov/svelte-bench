#!/usr/bin/env bash
# Measure output tokens per response (one sample per test) for each Ollama model, one at a time,
# then rebuild the report so the estimated response time shows up next to the speed figure.
# Host comes from OLLAMA_HOST in .env. A failed model is logged and skipped; progress is saved
# per sample, so re-running the script resumes where it stopped. Extra arguments are passed
# through to pnpm ollama-token-times, e.g. ./run-ollama-token-times.sh --force
set -uo pipefail
cd "$(dirname "$0")"

# Models must be present on the Ollama host (or set OLLAMA_TOKEN_TIMES_PULL=true to pull them).
# Models whose measurement file already covers every test are skipped unless --force is passed.
MODELS=(
  # Ordered roughly fastest first, so the quick models finish before the slow ones
  "lfm2:24b"
  "JetBrains/mellum2-instruct-q4_k_m"
  "laguna-xs-2.1:q4_K_M"
  "north-mini-code-1.0:q4_K_M"
  "nemotron-3.5-lightning:30b-a3b-q4_K_M"
  #"nemotron-3.5-lightning:30b-8k"  # <- locally created variant, not on the host; recreate it to measure
  "ornith-1.5:35b-q4_K_M"
  "qwen3.6:35b-a3b-q4_K_M"
  "glm-4.7-flash:q4_K_M"
  "gemma4:26b-a4b-it-q4_K_M"
  "hf.co/bartowski/nex-agi_Nex-N2.5-mini-GGUF:Q4_K_M"
  "gpt-oss:20b"
  "llama3.1:8b-instruct-q4_K_M"
  "qwen3.5:9b-q4_K_M"
  "qwen3.8:27b-mtp-q4_K_M"
  "mistral-nemo:12b-instruct-2407-q4_K_M"
  "qwen3.6:27b-coding-mtp-q4_K_M"
  # Under 5 tok/s: these can take hours if they think at length
  "muse-glimmer:30b-q4_K_M"
  "granite4.2:30b-q4_K_M"
  "gemma4:31b-it-q4_K_M"
  "llama3.3:70b-instruct-q2_K"
  #"gemma4:12b-it-q4_K_M"  # <- this one just WILL NOT RUN
)

mkdir -p logs
failed=()

for model in "${MODELS[@]}"; do
  echo "=== $(date '+%F %T') Starting $model ==="
  if pnpm ollama-token-times -- --model "$model" "$@" 2>&1 | tee "logs/ollama-token-times-${model//[\/:]/_}.log"; then
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
