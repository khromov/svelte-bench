/**
 * Model validation for text-only and quantization checks
 */

export interface ModelCapabilities {
  inputModalities: string[];
  outputModalities: string[];
  quantization?: string | null;
  isTextOnly: boolean;
  isQuantized: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  capabilities?: ModelCapabilities;
}

/**
 * Detect quantization level from model name
 * @param modelName The model name to check
 * @returns Quantization type or null if none detected
 */
export function detectQuantizationFromName(modelName: string): string | null {
  const quantizationPattern = /-(int4|int8|fp4|fp6|fp8|q4|q8|awq|gptq|gguf)(-|$|:)/i;
  const match = modelName.match(quantizationPattern);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Check if quantization is low-precision (likely to reduce accuracy)
 * @param quantization The quantization type
 * @returns True if quantization is considered low-precision
 */
export function isLowPrecisionQuantization(quantization: string): boolean {
  const lowPrecision = ["int4", "fp4", "fp6", "fp8", "int8", "q4", "q8", "awq", "gptq"];
  return lowPrecision.includes(quantization.toLowerCase());
}

/**
 * Validate model capabilities for text-only benchmarking
 * @param modelId The model identifier
 * @param capabilities Optional capabilities metadata
 * @returns Validation result with warnings/errors
 */
export function validateModel(modelId: string, capabilities?: Partial<ModelCapabilities>): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
  };

  // Detect quantization from name if not provided
  const detectedQuantization = detectQuantizationFromName(modelId);
  const quantization = capabilities?.quantization || detectedQuantization;

  // Determine modalities
  const inputModalities = capabilities?.inputModalities || ["text"];
  const outputModalities = capabilities?.outputModalities || ["text"];
  const isTextOnly =
    inputModalities.length === 1 &&
    inputModalities[0] === "text" &&
    outputModalities.length === 1 &&
    outputModalities[0] === "text";

  result.capabilities = {
    inputModalities,
    outputModalities,
    quantization,
    isTextOnly,
    isQuantized: !!quantization,
  };

  // Check for text-only requirement
  const strictTextOnly = process.env.STRICT_TEXT_ONLY !== "false";
  if (strictTextOnly && !isTextOnly) {
    result.isValid = false;
    result.errors.push(
      `Model "${modelId}" is not text-only (input: ${inputModalities.join(", ")}, output: ${outputModalities.join(", ")}). Set STRICT_TEXT_ONLY=false to allow.`,
    );
  }

  // Check quantization
  const allowQuantized = process.env.ALLOW_QUANTIZED_MODELS === "true";
  if (quantization && !allowQuantized) {
    if (isLowPrecisionQuantization(quantization)) {
      result.warnings.push(
        `⚠️  Model "${modelId}" uses ${quantization.toUpperCase()} quantization which may reduce accuracy. Set ALLOW_QUANTIZED_MODELS=true to suppress this warning.`,
      );
    }
  }

  return result;
}

/**
 * Format validation result for display
 * @param modelId The model identifier
 * @param validation The validation result
 * @returns Formatted string for console output
 */
export function formatValidationResult(modelId: string, validation: ValidationResult): string {
  const { capabilities } = validation;
  if (!capabilities) return `❓ ${modelId} (unknown capabilities)`;

  const parts: string[] = [];

  // Status emoji
  if (!validation.isValid) {
    parts.push("❌");
  } else if (validation.warnings.length > 0) {
    parts.push("⚠️ ");
  } else {
    parts.push("✅");
  }

  // Model ID
  parts.push(modelId);

  // Capabilities
  const caps: string[] = [];
  if (capabilities.isTextOnly) {
    caps.push("text-only");
  } else {
    caps.push(`input: ${capabilities.inputModalities.join("+")} → output: ${capabilities.outputModalities.join("+")}`);
  }

  if (capabilities.isQuantized && capabilities.quantization) {
    caps.push(`quantized: ${capabilities.quantization.toUpperCase()}`);
  } else {
    caps.push("unquantized");
  }

  parts.push(`(${caps.join(", ")})`);

  return parts.join(" ");
}

/**
 * Query OpenRouter API for model metadata
 * @param modelId The model identifier
 * @returns Model capabilities or null if not found
 */
export async function queryOpenRouterModelMetadata(modelId: string): Promise<Partial<ModelCapabilities> | null> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models");
    if (!response.ok) return null;

    const data = await response.json();
    const model = data.data?.find((m: any) => m.id === modelId || m.id === `openrouter/${modelId}`);

    if (!model?.architecture) return null;

    return {
      inputModalities: model.architecture.input_modalities || ["text"],
      outputModalities: model.architecture.output_modalities || ["text"],
    };
  } catch (error) {
    // Silently fail - validation will use defaults
    return null;
  }
}
