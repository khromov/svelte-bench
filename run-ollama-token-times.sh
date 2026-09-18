#!/usr/bin/env bash
# Measure output tokens per response (one sample per test) for each Ollama model, one at a time,
# then rebuild the report so the estimated response time shows up next to the speed figure.
# Host comes from OLLAMA_HOST in .env. A failed model is logged and skipped; progress is saved
# per sample, so re-running the script resumes where it stopped. Extra arguments are passed
# through to pnpm ollama-token-times, e.g. ./run-ollama-token-times.sh --force
set -uo pipefail
cd "$(dirname "$0")"

# Models must be present on the Ollama host (or set OLLAMA_TOKEN_TIMES_PULL=true to pull them).
# The commented ones have benchmark results but are no longer downloaded.
MODELS=(
  #"gemma4:26b-a4b-it-q4_K_M"
  #"gpt-oss:20b"
  #"llama3.1:8b-instruct-q4_K_M"
  #"muse-glimmer:30b-q4_K_M"
  #"nemotron-3.5-lightning:30b-a3b-q4_K_M"
  #"gemma4:31b-it-q4_K_M"
  #"laguna-xs-2.1:q4_K_M"
  #"north-mini-code-1.0:q4_K_M"
  #"llama3.3:70b-instruct-q2_K"
  #"nemotron-3.5-lightning:30b-8k"
  #"mistral-nemo:12b-instruct-2407-q4_K_M"
  #"granite4.2:30b-q4_K_M"
  #"qwen3.6:35b-a3b-q4_K_M"
  #"qwen3.8:27b-mtp-q4_K_M"
  # Still installed from earlier runs
  "ornith-1.5:35b-q4_K_M"
  "qwen3.5:9b-q4_K_M"
  # NEW RUN
  "glm-4.7-flash:q4_K_M"
  "qwen3.6:27b-coding-mtp-q4_K_M"
  #"gemma4:12b-it-q4_K_M"  # <- this one just WILL NOT RUN
  "lfm2:24b"
  "hf.co/bartowski/nex-agi_Nex-N2.5-mini-GGUF:Q4_K_M"
  "JetBrains/mellum2-instruct-q4_k_m"
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
