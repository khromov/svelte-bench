# $inspect Rune Component Task

Create a Svelte 5 component that demonstrates the `$inspect` rune functionality using a single input field.

## Requirements:

1. Use Svelte 5's `$state` for a text input starting with "Hello world"
2. Use basic `$inspect` to log the input value
3. Implement `$inspect(...).with` to track updates to the input with a custom callback
   - The callback should log a message in the format: `Text updated to: "{value}"`
4. Implement `$inspect.trace()` inside an effect that runs when the input changes
   - The effect should log a message in the format: `The text is now: "{text}" ({text.length} characters)`
5. Display the character count of the input text (to demonstrate a derived value that depends on the input)
6. Include an input field with `data-testid="text-input"`
7. Display the input value with `data-testid="text-value"` in the format: `Current text: "{text}"`
8. Display the character count with `data-testid="char-count"` in the format: `Character count: {count}`

## Important Implementation Notes:

- Your component must initialize with the text "Hello world"
- The character count must accurately reflect the number of characters in the text
- All data-testid attributes must match exactly as specified
- The text display formats must match exactly as specified
- Your component should handle all types of text input, including special characters and empty strings

Example structure:

```html
<div>
  <input data-testid="text-input" type="text" bind:value={text} />
  <p data-testid="text-value">Current text: "{text}"</p>
  <p data-testid="char-count">Character count: {text.length}</p>
</div>
```

Please implement this component using Svelte 5 runes.
