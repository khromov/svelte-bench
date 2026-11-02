/** Resolve an optional model page, including Ollama Hugging Face identifiers. */
export function modelUrl(modelId: string, explicitUrl?: string): string | undefined {
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
  return match ? `https://huggingface.co/${match[1]}/${match[2]}` : undefined;
}
