// Verified Ollama pages for model IDs already present in benchmark results.
const localModelPages: Record<string, string> = {
  "ornith-1.5": "https://ollama.com/library/ornith-1.5",
  "qwen3.5": "https://ollama.com/library/qwen3.5",
  gemma4: "https://ollama.com/library/gemma4",
  "gpt-oss": "https://ollama.com/library/gpt-oss",
  "llama3.1": "https://ollama.com/library/llama3.1",
  "muse-glimmer": "https://ollama.com/library/muse-glimmer",
  "nemotron-3.5-lightning": "https://ollama.com/library/nemotron-3.5-lightning",
  "laguna-xs-2.1": "https://ollama.com/library/laguna-xs-2.1",
  "north-mini-code-1.0": "https://ollama.com/library/north-mini-code-1.0",
  "llama3.3": "https://ollama.com/library/llama3.3",
  "mistral-nemo": "https://ollama.com/library/mistral-nemo",
  "granite4.2": "https://ollama.com/library/granite4.2",
  "qwen3.6": "https://ollama.com/library/qwen3.6",
  "qwen3.8": "https://ollama.com/library/qwen3.8",
  "glm-4.7-flash": "https://ollama.com/library/glm-4.7-flash",
  lfm2: "https://ollama.com/library/lfm2",
  "rnj-1": "https://ollama.com/library/rnj-1",
  "lfm2.5": "https://ollama.com/library/lfm2.5",
  "nemotron-3.5-bolt": "https://ollama.com/library/nemotron-3.5-bolt",
  flint: "https://ollama.com/library/flint",
  "JetBrains/mellum2-instruct-q4_k_m": "https://ollama.com/JetBrains/mellum2-instruct-q4_k_m",
  "barvhaim/granite-switch-4.1-3b-preview": "https://ollama.com/barvhaim/granite-switch-4.1-3b-preview",
};

/** Resolve an optional model page, including Ollama Hugging Face identifiers. */
export function modelUrl(modelId: string, explicitUrl?: string, provider?: string): string | undefined {
  if (explicitUrl) {
    try {
      const url = new URL(explicitUrl);
      if (url.protocol === "https:" || url.protocol === "http:") return url.href;
    } catch {
      // Ignore invalid URLs.
    }
    return undefined;
  }
  const match = /^hf\.co\/([^/ :]+)\/([^/ :]+)(?::[^/]+)?$/.exec(modelId);
  if (match) return `https://huggingface.co/${match[1]}/${match[2]}`;
  return provider?.toLowerCase() === "ollama" ? localModelPages[modelId.split(":")[0]] : undefined;
}
