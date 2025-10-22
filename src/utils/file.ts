import fs from "fs/promises";
import path from "path";
import { rimraf } from "rimraf";

// Maximum retry attempts for file operations
const MAX_RETRIES = 3;
const RETRY_DELAY = 500; // milliseconds

/**
 * Helper function to add delay between retries
 * @param ms milliseconds to delay
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Get the temporary directory for storing generated components
 * @param provider The provider name (optional)
 * @param useMCP Whether to use MCP-specific directory (optional)
 * @returns The path to the temporary samples directory
 */
export function getTmpDir(provider?: string, useMCP: boolean = false): string {
  const baseDir = path.resolve(process.cwd(), "tmp");
  if (provider) {
    const providerDir = useMCP 
      ? path.join("samples", "mcp", provider.toLowerCase())
      : path.join("samples", provider.toLowerCase());
    return path.join(baseDir, providerDir);
  }
  return baseDir;
}

/**
 * Get the directory for checkpoint files for a specific provider
 * @param provider The provider name
 * @param useMCP Whether to use MCP-specific directory (optional)
 * @returns The path to the checkpoint directory
 */
export function getCheckpointDir(provider: string, useMCP: boolean = false): string {
  const baseDir = path.resolve(process.cwd(), "tmp");
  const checkpointDir = useMCP
    ? path.join("checkpoint", "mcp", provider.toLowerCase())
    : path.join("checkpoint", provider.toLowerCase());
  return path.join(baseDir, checkpointDir);
}

/**
 * Ensure the temporary directory exists for a specific provider
 * @param provider The provider name (optional)
 * @param useMCP Whether to use MCP-specific directory (optional)
 */
export async function ensureTmpDir(provider?: string, useMCP: boolean = false): Promise<void> {
  try {
    const tmpDir = getTmpDir(provider, useMCP);
    await fs.mkdir(tmpDir, { recursive: true });
  } catch (error) {
    console.error(
      `Error creating tmp directory for ${provider || "base"}:`,
      error
    );
    throw error;
  }
}

/**
 * Ensure the checkpoint directory exists for a specific provider
 * @param provider The provider name
 * @param useMCP Whether to use MCP-specific directory (optional)
 */
export async function ensureCheckpointDir(provider: string, useMCP: boolean = false): Promise<void> {
  try {
    const checkpointDir = getCheckpointDir(provider, useMCP);
    await fs.mkdir(checkpointDir, { recursive: true });
  } catch (error) {
    console.error(
      `Error creating checkpoint directory for ${provider}:`,
      error
    );
    throw error;
  }
}

/**
 * Clean the temporary directory for a specific provider with retry logic
 * @param provider The provider name (optional)
 * @param useMCP Whether to use MCP-specific directory (optional)
 */
export async function cleanTmpDir(provider?: string, useMCP: boolean = false): Promise<void> {
  let retries = 0;
  const tmpDir = getTmpDir(provider, useMCP);

  while (retries < MAX_RETRIES) {
    try {
      // Use rimraf to recursively remove directory contents
      // This properly handles subdirectories and permission issues better than fs.unlink
      await rimraf(tmpDir);

      // Re-create the empty directory
      await ensureTmpDir(provider, useMCP);

      console.log(`✨ Cleaned samples directory for ${provider || "base"}`);
      return;
    } catch (error) {
      retries++;
      console.warn(
        `Warning: Failed to clean samples directory for ${
          provider || "base"
        } (attempt ${retries}/${MAX_RETRIES}):`,
        error
      );

      if (retries < MAX_RETRIES) {
        // Wait a bit before retrying to allow any file locks to clear
        await delay(RETRY_DELAY * retries);
      } else {
        console.error(
          `Failed to clean samples directory for ${
            provider || "base"
          } after ${MAX_RETRIES} attempts`
        );
        // Don't throw the error, just log it and continue
      }
    }
  }
}

/**
 * Clean the checkpoint directory for a specific provider with retry logic
 * This is used when starting a new run to clear previous checkpoints
 * @param provider The provider name
 * @param useMCP Whether to use MCP-specific directory (optional)
 */
export async function cleanCheckpointDir(provider: string, useMCP: boolean = false): Promise<void> {
  let retries = 0;
  const checkpointDir = getCheckpointDir(provider, useMCP);

  while (retries < MAX_RETRIES) {
    try {
      // Use rimraf to recursively remove directory contents
      await rimraf(checkpointDir);
      
      console.log(`✨ Cleaned checkpoint directory for ${provider}`);
      return;
    } catch (error) {
      retries++;
      console.warn(
        `Warning: Failed to clean checkpoint directory for ${provider} (attempt ${retries}/${MAX_RETRIES}):`,
        error
      );

      if (retries < MAX_RETRIES) {
        await delay(RETRY_DELAY * retries);
      } else {
        console.error(
          `Failed to clean checkpoint directory for ${provider} after ${MAX_RETRIES} attempts`
        );
        // Don't throw the error, just log it and continue
      }
    }
  }
}

/**
 * Write content to a file in the temporary directory for a specific provider with retry logic
 * @param filename The name of the file
 * @param content The content to write
 * @param provider The provider name (optional)
 */
export async function writeToTmpFile(
  filename: string,
  content: string,
  provider?: string,
  useMCP: boolean = false
): Promise<string> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      await ensureTmpDir(provider, useMCP);
      const tmpDir = getTmpDir(provider, useMCP);
      const filePath = path.join(tmpDir, filename);
      await fs.writeFile(filePath, content);
      console.log(`📝 Wrote to ${filePath}`);
      return filePath;
    } catch (error) {
      retries++;
      console.warn(
        `Warning: Failed to write to ${filename} for ${
          provider || "base"
        } (attempt ${retries}/${MAX_RETRIES}):`,
        error
      );

      if (retries < MAX_RETRIES) {
        await delay(RETRY_DELAY * retries);
      } else {
        console.error(
          `Error writing to ${filename} for ${
            provider || "base"
          } after ${MAX_RETRIES} attempts:`,
          error
        );
        throw error;
      }
    }
  }

  throw new Error(
    `Failed to write to ${filename} after ${MAX_RETRIES} attempts`
  );
}

/**
 * Copy a file to the temporary directory for a specific provider with retry logic
 * @param sourcePath The path to the source file
 * @param destFilename The name of the destination file
 * @param provider The provider name (optional)
 */
export async function copyToTmpDir(
  sourcePath: string,
  destFilename: string,
  provider?: string,
  useMCP: boolean = false
): Promise<string> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      await ensureTmpDir(provider, useMCP);
      const tmpDir = getTmpDir(provider, useMCP);
      const destPath = path.join(tmpDir, destFilename);
      await fs.copyFile(sourcePath, destPath);
      console.log(`📋 Copied ${sourcePath} to ${destPath}`);
      return destPath;
    } catch (error) {
      retries++;
      console.warn(
        `Warning: Failed to copy ${sourcePath} for ${
          provider || "base"
        } (attempt ${retries}/${MAX_RETRIES}):`,
        error
      );

      if (retries < MAX_RETRIES) {
        await delay(RETRY_DELAY * retries);
      } else {
        console.error(
          `Error copying ${sourcePath} for ${
            provider || "base"
          } after ${MAX_RETRIES} attempts:`,
          error
        );
        throw error;
      }
    }
  }

  throw new Error(
    `Failed to copy to ${destFilename} after ${MAX_RETRIES} attempts`
  );
}

/**
 * Read a file from the specified path with retry logic
 * @param filePath The path to the file
 * @returns The content of the file
 */
export async function readFile(filePath: string): Promise<string> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch (error) {
      retries++;
      console.warn(
        `Warning: Failed to read ${filePath} (attempt ${retries}/${MAX_RETRIES}):`,
        error
      );

      if (retries < MAX_RETRIES) {
        await delay(RETRY_DELAY * retries);
      } else {
        console.error(
          `Error reading ${filePath} after ${MAX_RETRIES} attempts:`,
          error
        );
        throw error;
      }
    }
  }

  throw new Error(`Failed to read ${filePath} after ${MAX_RETRIES} attempts`);
}

/**
 * Load context from a file
 * @param filePath The path to the context file
 * @returns The context content as a string
 */
export async function loadContextFile(filePath: string): Promise<string> {
  try {
    if (!filePath) return "";

    // Check if the file exists
    await fs.access(filePath);

    // Read the file
    const contextContent = await fs.readFile(filePath, "utf-8");
    console.log(`📄 Loaded context file from ${filePath}`);
    return contextContent;
  } catch (error) {
    console.error(`Error loading context file ${filePath}:`, error);
    throw new Error(
      `Failed to load context file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get the checkpoint file path for a specific provider and model
 * @param provider The provider name
 * @param modelId The model identifier
 * @param useMCP Whether to use MCP-specific directory (optional)
 * @returns The checkpoint file path
 */
export function getCheckpointPath(provider: string, modelId: string, useMCP: boolean = false): string {
  const checkpointDir = getCheckpointDir(provider, useMCP);
  const safeModelId = modelId.replace(/[^a-zA-Z0-9\-_]/g, '-');
  return path.join(checkpointDir, `checkpoint-${safeModelId}.json`);
}

/**
 * Save checkpoint data to file
 * @param provider The provider name
 * @param modelId The model identifier  
 * @param checkpointData The checkpoint data to save
 * @param useMCP Whether to use MCP-specific directory (optional)
 */
export async function saveCheckpoint(
  provider: string,
  modelId: string,
  checkpointData: any,
  useMCP: boolean = false
): Promise<void> {
  try {
    await ensureCheckpointDir(provider, useMCP);
    const checkpointPath = getCheckpointPath(provider, modelId, useMCP);
    await fs.writeFile(checkpointPath, JSON.stringify(checkpointData, null, 2));
    console.log(`💾 Saved checkpoint for ${provider}/${modelId}`);
  } catch (error) {
    console.error(`Error saving checkpoint for ${provider}/${modelId}:`, error);
    // Don't throw - checkpoint saving should not fail the test run
  }
}

/**
 * Load checkpoint data from file
 * @param provider The provider name
 * @param modelId The model identifier
 * @param useMCP Whether to use MCP-specific directory (optional)
 * @returns The checkpoint data or null if not found
 */
export async function loadCheckpoint(
  provider: string,
  modelId: string,
  useMCP: boolean = false
): Promise<any | null> {
  try {
    const checkpointPath = getCheckpointPath(provider, modelId, useMCP);
    await fs.access(checkpointPath);
    const data = await fs.readFile(checkpointPath, "utf-8");
    const checkpoint = JSON.parse(data);
    console.log(`🔄 Loaded checkpoint for ${provider}/${modelId}`);
    return checkpoint;
  } catch (error) {
    // File doesn't exist or can't be read - this is expected for new runs
    return null;
  }
}

/**
 * Remove checkpoint file for a specific provider and model
 * @param provider The provider name
 * @param modelId The model identifier
 */
export async function removeCheckpoint(
  provider: string,
  modelId: string
): Promise<void> {
  try {
    const checkpointPath = getCheckpointPath(provider, modelId);
    await fs.unlink(checkpointPath);
    console.log(`🗑️ Removed checkpoint for ${provider}/${modelId}`);
  } catch (error) {
    // File might not exist - this is fine
  }
}
