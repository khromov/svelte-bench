/**
 * Utility to ensure all required directories exist
 */

import fs from "fs/promises";
import path from "path";

/**
 * Ensure that required directories exist
 */
export async function ensureRequiredDirectories(): Promise<void> {
  const dirs = [
    path.resolve(process.cwd(), "tmp"),
    path.resolve(process.cwd(), "benchmarks"),
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
      throw error;
    }
  }
}
