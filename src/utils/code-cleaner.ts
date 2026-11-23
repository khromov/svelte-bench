// Models whose GGUF chat template doesn't declare thinking support, so Ollama leaves their
// <think>...</think> reasoning inline in the response content instead of splitting it out.
const INLINE_THINKING_MODELS = /ripple/i;
const THINK_CLOSE_TAG = "</think>";

/**
 * Drops inline reasoning from models that emit it in the response content.
 * Only applies to models matching INLINE_THINKING_MODELS; everything up to and including the
 * last </think> is removed. A response with an unclosed <think> is returned unchanged.
 */
export function stripInlineThinking(code: string, modelId: string): string {
  if (!INLINE_THINKING_MODELS.test(modelId)) return code;
  const end = code.lastIndexOf(THINK_CLOSE_TAG);
  return end === -1 ? code : code.slice(end + THINK_CLOSE_TAG.length);
}

/**
 * Cleans markdown code block formatting from LLM-generated code
 *
 * This function handles various types of code block formatting that might be present
 * in the LLM output, including:
 * - Triple backticks with language identifiers (```svelte, ```html, ```js, etc.)
 * - Triple backticks without language identifiers
 * - Nested code blocks
 * - Improperly formatted code blocks
 *
 * @param code The code to clean
 * @returns The cleaned code with all markdown code block formatting removed
 */
export function cleanCodeMarkdown(code: string): string {
  // First, remove any opening code block markers with language identifiers
  // This handles patterns like ```svelte, ```html, ```js, etc.
  let cleanedCode = code.replace(/```[a-zA-Z]*\s*/g, "");

  // Remove any standalone triple backticks
  cleanedCode = cleanedCode.replace(/```/g, "");

  // Note: We do NOT remove single or double backticks as they are used in:
  // - JavaScript template literals (e.g., `string ${var}`)
  // - Inline code in markdown (e.g., `code`)
  // Only the triple backtick code fences should be removed

  // Trim whitespace from the beginning and end
  return cleanedCode.trim();
}
