import { describe, it, expect } from "vitest";
import { cleanCodeMarkdown, stripInlineThinking } from "./code-cleaner";

describe("cleanCodeMarkdown", () => {
  it("should remove triple backticks with language identifier", () => {
    const input = "```svelte\n<div>Hello</div>\n```";
    const expected = "<div>Hello</div>";
    expect(cleanCodeMarkdown(input)).toBe(expected);
  });

  it("should remove triple backticks without language identifier", () => {
    const input = "```\n<div>Hello</div>\n```";
    const expected = "<div>Hello</div>";
    expect(cleanCodeMarkdown(input)).toBe(expected);
  });

  it("should preserve backticks in JavaScript template literals", () => {
    const input = 'console.log(`Text changed from "${oldValue}" to "${newValue}"`)';
    const expected = 'console.log(`Text changed from "${oldValue}" to "${newValue}"`)';
    expect(cleanCodeMarkdown(input)).toBe(expected);
  });

  it("should preserve backticks in template literals within code blocks", () => {
    const input = `\`\`\`js
$inspect(text).with((newValue, oldValue) => {
  console.log(\`Text changed from "\${oldValue}" to "\${newValue}"\`)
})
\`\`\``;
    const expected = `$inspect(text).with((newValue, oldValue) => {
  console.log(\`Text changed from "\${oldValue}" to "\${newValue}"\`)
})`;
    expect(cleanCodeMarkdown(input)).toBe(expected);
  });

  it("should handle multiple code blocks", () => {
    const input = `\`\`\`svelte
<script>
  let value = \`hello \${name}\`;
</script>
\`\`\`

\`\`\`js
console.log(\`value: \${value}\`);
\`\`\``;
    const expected = `<script>
  let value = \`hello \${name}\`;
</script>
console.log(\`value: \${value}\`);`;
    expect(cleanCodeMarkdown(input)).toBe(expected);
  });

  it("should preserve single backticks in inline code", () => {
    const input = "The variable `count` is used here";
    const expected = "The variable `count` is used here";
    expect(cleanCodeMarkdown(input)).toBe(expected);
  });

  it("should handle edge case with backticks at start and end", () => {
    const input = "`code`";
    const expected = "`code`";
    expect(cleanCodeMarkdown(input)).toBe(expected);
  });

  it("should remove only markdown code fences, not content backticks", () => {
    const input = `\`\`\`javascript
const greeting = \`Hello, \${name}!\`;
const farewell = \`Goodbye, \${name}!\`;
\`\`\``;
    const expected = `const greeting = \`Hello, \${name}!\`;
const farewell = \`Goodbye, \${name}!\`;`;
    expect(cleanCodeMarkdown(input)).toBe(expected);
  });

  it("should handle the real-world inspect example from the issue", () => {
    const input = `\`\`\`svelte
$inspect(text).with((newValue, oldValue) => {
  console.log(\`Text changed from "\${oldValue}" to "\${newValue}"\`)
})
\`\`\``;
    const expected = `$inspect(text).with((newValue, oldValue) => {
  console.log(\`Text changed from "\${oldValue}" to "\${newValue}"\`)
})`;
    expect(cleanCodeMarkdown(input)).toBe(expected);
  });
});

describe("stripInlineThinking", () => {
  const RIPPLE = "hf.co/AtomicChat/Ripple-65B-Preview-GGUF:IQ3_XXS";
  const component = '<div data-testid="greeting">Hello, World!</div>';

  it("removes a <think> block for Ripple models", () => {
    const input = `<think>\nWe need a <div> with {braces}.\n</think>\n${component}`;
    expect(stripInlineThinking(input, RIPPLE).trim()).toBe(component);
  });

  it("matches Ripple model ids case-insensitively", () => {
    const input = `<think>reasoning</think>${component}`;
    expect(stripInlineThinking(input, "ripple-preview:65b-q4_K_M")).toBe(component);
  });

  it("removes reasoning when only the closing tag is emitted", () => {
    const input = `reasoning from a template-opened block\n</think>\n${component}`;
    expect(stripInlineThinking(input, RIPPLE).trim()).toBe(component);
  });

  it("leaves an unclosed <think> unchanged", () => {
    const input = `<think>\nreasoning\n${component}`;
    expect(stripInlineThinking(input, RIPPLE)).toBe(input);
  });

  it("does not touch other models", () => {
    const input = `<think>reasoning</think>${component}`;
    expect(stripInlineThinking(input, "hf.co/Brooooooklyn/Clairic-GGUF:UD-Q4_K_XL")).toBe(input);
  });

  it("works with markdown cleaning afterwards", () => {
    const input = `<think>\nuse \`\`\`svelte fences?\n</think>\n\`\`\`svelte\n${component}\n\`\`\``;
    expect(cleanCodeMarkdown(stripInlineThinking(input, RIPPLE))).toBe(component);
  });
});
