import { describe, it, expect } from "vitest";
import { cleanCodeMarkdown } from "./code-cleaner";

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
