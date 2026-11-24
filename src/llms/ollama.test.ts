import { describe, it, expect } from "vitest";
import { getOllamaModelOptions } from "./ollama";

describe("getOllamaModelOptions", () => {
  it("loads Ripple models with a 4k context", () => {
    expect(getOllamaModelOptions("hf.co/AtomicChat/Ripple-65B-Preview-GGUF:IQ3_XXS")).toEqual({ num_ctx: 4096 });
    expect(getOllamaModelOptions("ripple-preview:65b-q4_K_M")).toEqual({ num_ctx: 4096 });
  });

  it("adds no options for other models", () => {
    expect(getOllamaModelOptions("hf.co/Brooooooklyn/Clairic-GGUF:UD-Q4_K_XL")).toEqual({});
  });
});
