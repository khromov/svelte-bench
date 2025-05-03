export const DEFAULT_SYSTEM_PROMPT =
  "You are an expert Svelte developer. Generate only the Svelte component code requested. Return just the code with no explanation, comments, or markdown. Runes starting with $ like $state and $effect are never imported, they are built-in.";

// New system prompt variant for use with context
export const DEFAULT_SYSTEM_PROMPT_WITH_CONTEXT =
  "You are an expert Svelte developer. You are provided with the Svelte documentation, use it when implementing your solution. Generate only the Svelte component code requested. Return just the code with no explanation, comments, or markdown. Runes starting with $ like $state and $effect are never imported, they are built-in.";
