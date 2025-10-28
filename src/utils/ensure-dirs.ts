/**
 * Utility to ensure all required directories exist
 */

import fs from "fs/promises";
import path from "path";
import { getAllLLMProviders } from "../llms";

/**
 * Ensure that required directories exist
 */
export async function ensureRequiredDirectories(): Promise<void> {
  // Base directories
  const baseDirectories = [
    path.resolve(process.cwd(), "tmp"),
    path.resolve(process.cwd(), "tmp", "samples"),
    path.resolve(process.cwd(), "tmp", "checkpoint"),
    path.resolve(process.cwd(), "benchmarks"),
  ];

  for (const dir of baseDirectories) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
      throw error;
    }
  }

  // Create provider-specific directories
  try {
    const providerModels = await getAllLLMProviders();

    // Get unique provider names
    const providerNames = [...new Set(providerModels.map((pm) => pm.name))];

    // Create sample and checkpoint directories for each provider
    for (const provider of providerNames) {
      const sampleDir = path.resolve(process.cwd(), "tmp", "samples", provider.toLowerCase());
      const checkpointDir = path.resolve(process.cwd(), "tmp", "checkpoint", provider.toLowerCase());
      await fs.mkdir(sampleDir, { recursive: true });
      await fs.mkdir(checkpointDir, { recursive: true });
    }
  } catch (error) {
    console.error("Error creating provider-specific directories:", error);
    // Don't throw here, as missing provider-specific directories will be created on demand
    console.warn("Provider-specific directories will be created on demand");
  }
}
