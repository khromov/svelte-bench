# Each Block Component Task

Create a simple Svelte 5 component that demonstrates the `{#each}` block.

## Requirements:

1. Create a component with a hardcoded array of 3 colors: "Red", "Green", "Blue"
2. Use the `{#each}` block to render all colors in a list
3. Add a button that changes all colors to uppercase when clicked
4. Each item should display its index + color name

Elements should have these data-testid attributes:

- "colors-list" for the list container
- "color-0", "color-1", etc. for each color item
- "uppercase-button" for the button

Example structure:

```html
<div>
  <ul data-testid="colors-list">
    <li data-testid="color-{0}">{1}: Red</li>
    ...
  </ul>
  <button data-testid="uppercase-button">Make Uppercase</button>
</div>
```

Please implement this component using Svelte 5 runes.
