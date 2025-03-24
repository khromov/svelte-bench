# $derived.by Component Task

Create a Svelte 5 component that demonstrates the `$derived.by` rune for complex derivations.

## Requirements:

1. Create a text input field that allows the user to enter text
2. Use `$state` to store the current text value, starting with an empty string
3. Use `$derived.by` to calculate:
   - The number of words in the text
   - The number of characters in the text
   - Whether the text is considered "long" (more than 15 words)
4. Display all these derived values below the input field
5. Include a "Clear" button that resets the text to an empty string

Elements should have these data-testid attributes:

- "text-input" for the input field
- "word-count" for displaying the word count
- "char-count" for displaying the character count
- "length-indicator" for displaying whether the text is long
- "clear-button" for the clear button

Example structure:

```html
<div>
  <input data-testid="text-input" type="text" />
  <button data-testid="clear-button">Clear</button>
  <div>
    <p data-testid="word-count">Words: 0</p>
    <p data-testid="char-count">Characters: 0</p>
    <p data-testid="length-indicator">Status: Short text</p>
  </div>
</div>
```

Please implement this component using Svelte 5 runes.
