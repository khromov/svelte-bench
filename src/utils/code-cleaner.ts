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

  // Handle potential single or double backticks that might be leftover
  cleanedCode = cleanedCode.replace(/``|`/g, "");

  // Trim whitespace from the beginning and end
  return cleanedCode.trim();
}
