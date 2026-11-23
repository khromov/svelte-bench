import type { LLMProvider } from "../llms";
import { cleanCodeMarkdown, stripInlineThinking } from "./code-cleaner";
import { withRetry, type RetryOptions } from "./retry-wrapper";
import { reportProviderError } from "./tui-events";

export async function generateBenchmarkCode(
  provider: LLMProvider,
  testName: string,
  sampleIndex: number,
  prompt: string,
  temperature?: number,
  contextContent?: string,
  retryOptions?: RetryOptions,
): Promise<string> {
  const stage = `${testName}, sample ${sampleIndex + 1}`;
  const model = provider.getModelIdentifier();
  try {
    return await withRetry(async () => {
      const rawCode = await provider.generateCode(prompt, temperature, contextContent);
      const code = cleanCodeMarkdown(stripInlineThinking(rawCode, model));
      if (!code.trim()) throw new Error("Provider returned no code");
      return code;
    }, {
      ...retryOptions,
      onRetry: (error, attempt) =>
        reportProviderError(provider.name, model, `${stage}, retry ${attempt}`, error),
    });
  } catch (error) {
    reportProviderError(provider.name, model, stage, error);
    throw error;
  }
}
