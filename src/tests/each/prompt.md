# Each Block Component Task

Create a simple Svelte 5 component that demonstrates the `{#each}` block.

## Requirements:

1. Create a component with a hardcoded array of 3 Seinfeld characters: "Jerry", "Elaine", "Kramer"
2. Use the `{#each}` block to render all characters in a list
3. Add a button that adds another character "George" to the array when clicked
4. Each item should display just the character name

Elements should have these data-testid attributes:

- "characters-list" for the list container
- "character" for each character item
- "add-george-button" for the button to add George

Example structure:

```html
<div>
  <ul data-testid="characters-list">
    <li data-testid="character">Jerry</li>
    ...
  </ul>
  <button data-testid="add-george-button">Add George</button>
</div>
```

Please implement this component using Svelte 5 runes.
