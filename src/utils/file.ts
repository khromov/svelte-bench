import fs from "fs/promises";
import path from "path";

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
 * Clean the temporary directory for a specific provider
 * @param provider The provider name (optional)
 */
export async function cleanTmpDir(provider?: string): Promise<void> {
  try {
    // Ensure the temp directory exists
    await ensureTmpDir(provider);

    const tmpDir = getTmpDir(provider);
    const files = await fs.readdir(tmpDir);

    await Promise.all(
      files.map((file) =>
        fs
          .unlink(path.join(tmpDir, file))
          .catch((err) => console.warn(`Failed to delete ${file}:`, err))
      )
    );

    console.log(`✨ Cleaned tmp directory for ${provider || "base"}`);
  } catch (error) {
    console.error(
      `Error cleaning tmp directory for ${provider || "base"}:`,
      error
    );
    throw error;
  }
}

/**
 * Write content to a file in the temporary directory for a specific provider
 * @param filename The name of the file
 * @param content The content to write
 * @param provider The provider name (optional)
 */
export async function writeToTmpFile(
  filename: string,
  content: string,
  provider?: string
): Promise<string> {
  try {
    await ensureTmpDir(provider);
    const tmpDir = getTmpDir(provider);
    const filePath = path.join(tmpDir, filename);
    await fs.writeFile(filePath, content);
    console.log(`📝 Wrote to ${filePath}`);
    return filePath;
  } catch (error) {
    console.error(
      `Error writing to ${filename} for ${provider || "base"}:`,
      error
    );
    throw error;
  }
}

/**
 * Copy a file to the temporary directory for a specific provider
 * @param sourcePath The path to the source file
 * @param destFilename The name of the destination file
 * @param provider The provider name (optional)
 */
export async function copyToTmpDir(
  sourcePath: string,
  destFilename: string,
  provider?: string
): Promise<string> {
  try {
    await ensureTmpDir(provider);
    const tmpDir = getTmpDir(provider);
    const destPath = path.join(tmpDir, destFilename);
    await fs.copyFile(sourcePath, destPath);
    console.log(`📋 Copied ${sourcePath} to ${destPath}`);
    return destPath;
  } catch (error) {
    console.error(
      `Error copying ${sourcePath} for ${provider || "base"}:`,
      error
    );
    throw error;
  }
}

/**
 * Read a file from the specified path
 * @param filePath The path to the file
 * @returns The content of the file
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    throw error;
  }
}
