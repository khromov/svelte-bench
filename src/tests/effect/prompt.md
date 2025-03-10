# $effect Rune Component Task

Create a simple Svelte 5 component that demonstrates the `$effect` rune.

## Requirements:

1. Use `$state` for a number input starting at 5
2. Use `$effect` to calculate the doubled value of the number
3. Display both the number and the doubled value
4. Include a button to increment the number by 1

Elements should have these data-testid attributes:

- "number-value" for displaying the number
- "doubled-value" for displaying the doubled result
- "increment-button" for the increment button

Example structure:

```html
<div>
  <p data-testid="number-value">Number: {number}</p>
  <p data-testid="doubled-value">Doubled: {doubled}</p>
  <button data-testid="increment-button">Increment</button>
</div>
```

Please implement this component using Svelte 5 runes.
