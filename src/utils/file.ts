import fs from "fs/promises";
import path from "path";

/**
 * Directory for temporary files
 */
export const TMP_DIR = path.resolve(process.cwd(), "tmp");

/**
 * Get the path to a test-specific tmp directory
 * @param testName The name of the test
 * @returns The path to the test-specific tmp directory
 */
export function getTestTmpDir(testName: string): string {
  return path.join(TMP_DIR, testName);
}

/**
 * Ensure a test-specific tmp directory exists
 * @param testName The name of the test
 */
export async function ensureTestTmpDir(testName: string): Promise<void> {
  const testTmpDir = getTestTmpDir(testName);
  try {
    await fs.mkdir(testTmpDir, { recursive: true });
  } catch (error) {
    console.error(`Error creating tmp directory for test ${testName}:`, error);
    throw error;
  }
}

/**
 * Ensure the temporary directory exists
 */
export async function ensureTmpDir(): Promise<void> {
  try {
    await fs.mkdir(TMP_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating tmp directory:", error);
    throw error;
  }
}

/**
 * Clean the temporary directory
 */
export async function cleanTmpDir(): Promise<void> {
  try {
    await ensureTmpDir();
    const files = await fs.readdir(TMP_DIR);

    await Promise.all(
      files.map((file) =>
        fs
          .unlink(path.join(TMP_DIR, file))
          .catch((err) => console.warn(`Failed to delete ${file}:`, err))
      )
    );

    console.log("✨ Cleaned tmp directory");
  } catch (error) {
    console.error("Error cleaning tmp directory:", error);
    throw error;
  }
}

/**
 * Write content to a file in the temporary directory
 * @param filename The name of the file
 * @param content The content to write
 * @param testName Optional test name for test-specific directory
 */
export async function writeToTmpFile(
  filename: string,
  content: string,
  testName?: string
): Promise<string> {
  try {
    if (testName) {
      await ensureTestTmpDir(testName);
      const filePath = path.join(getTestTmpDir(testName), filename);
      await fs.writeFile(filePath, content);
      console.log(`📝 Wrote to ${filePath}`);
      return filePath;
    } else {
      await ensureTmpDir();
      const filePath = path.join(TMP_DIR, filename);
      await fs.writeFile(filePath, content);
      console.log(`📝 Wrote to ${filePath}`);
      return filePath;
    }
  } catch (error) {
    console.error(`Error writing to ${filename}:`, error);
    throw error;
  }
}

/**
 * Copy a file to the temporary directory
 * @param sourcePath The path to the source file
 * @param destFilename The name of the destination file
 * @param testName Optional test name for test-specific directory
 */
export async function copyToTmpDir(
  sourcePath: string,
  destFilename: string,
  testName?: string
): Promise<string> {
  try {
    if (testName) {
      await ensureTestTmpDir(testName);
      const destPath = path.join(getTestTmpDir(testName), destFilename);
      await fs.copyFile(sourcePath, destPath);
      console.log(`📋 Copied ${sourcePath} to ${destPath}`);
      return destPath;
    } else {
      await ensureTmpDir();
      const destPath = path.join(TMP_DIR, destFilename);
      await fs.copyFile(sourcePath, destPath);
      console.log(`📋 Copied ${sourcePath} to ${destPath}`);
      return destPath;
    }
  } catch (error) {
    console.error(`Error copying ${sourcePath}:`, error);
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
