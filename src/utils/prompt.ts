import fs from 'fs/promises';
import path from 'path';

/**
 * Read the system prompt from the markdown file
 * @returns The system prompt content
 */
export async function getSystemPrompt(): Promise<string> {
  try {
    const promptPath = path.resolve(process.cwd(), 'src/prompts/system-prompt.md');
    return await fs.readFile(promptPath, 'utf-8');
  } catch (error) {
    console.error('Error reading system prompt:', error);
    throw error;
  }
}

/**
 * Read the context prompt from the markdown file
 * @returns The context prompt content
 */
export async function getContextPrompt(): Promise<string> {
  try {
    // const promptPath = path.resolve(process.cwd(), 'src/prompts/context-prompt-llms-medium.md');
    // const promptPath = path.resolve(process.cwd(), 'src/prompts/context-prompt-llms-small.md');
    const promptPath = path.resolve(process.cwd(), 'src/prompts/context-prompt.md');
    return await fs.readFile(promptPath, 'utf-8');
  } catch (error) {
    console.error('Error reading context prompt:', error);
    throw error;
  }
}
