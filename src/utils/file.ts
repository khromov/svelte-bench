import fs from "fs/promises";
import path from "path";
import { rimraf } from "rimraf";

// Maximum retry attempts for file operations
const MAX_RETRIES = 3;
const RETRY_DELAY = 500; // milliseconds

/**
 * Get the directory for temporary files for a specific provider
 * @param provider The provider name (optional)
 * @returns The path to the temporary directory
 */
export function getTmpDir(provider?: string): string {
  const baseDir = path.resolve(process.cwd(), "tmp");
  return provider ? path.join(baseDir, provider.toLowerCase()) : baseDir;
}

/**
 * Ensure the temporary directory exists for a specific provider
 * @param provider The provider name (optional)
 */
export async function ensureTmpDir(provider?: string): Promise<void> {
  try {
    const tmpDir = getTmpDir(provider);
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
 * Helper function to add delay between retries
 * @param ms milliseconds to delay
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Clean the temporary directory for a specific provider with retry logic
 * @param provider The provider name (optional)
 */
export async function cleanTmpDir(provider?: string): Promise<void> {
  let retries = 0;
  const tmpDir = getTmpDir(provider);

  while (retries < MAX_RETRIES) {
    try {
      // Use rimraf to recursively remove directory contents
      // This properly handles subdirectories and permission issues better than fs.unlink
      await rimraf(tmpDir);

      // Re-create the empty directory
      await ensureTmpDir(provider);

      console.log(`✨ Cleaned tmp directory for ${provider || "base"}`);
      return;
    } catch (error) {
      retries++;
      console.warn(
        `Warning: Failed to clean tmp directory for ${
          provider || "base"
        } (attempt ${retries}/${MAX_RETRIES}):`,
        error
      );

      if (retries < MAX_RETRIES) {
        // Wait a bit before retrying to allow any file locks to clear
        await delay(RETRY_DELAY * retries);
      } else {
        console.error(
          `Failed to clean tmp directory for ${
            provider || "base"
          } after ${MAX_RETRIES} attempts`
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
  provider?: string
): Promise<string> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      await ensureTmpDir(provider);
      const tmpDir = getTmpDir(provider);
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
  provider?: string
): Promise<string> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      await ensureTmpDir(provider);
      const tmpDir = getTmpDir(provider);
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
