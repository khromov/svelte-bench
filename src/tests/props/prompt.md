# $props Rune Component Task

Create a Svelte 5 component that demonstrates the `$props` rune for accepting and using component properties.

## Requirements:

1. Create a component called PropsDemo that uses the `$props` rune to accept the following properties:

   - `name` (string) with a default value of "World"
   - `count` (number) with a default value of 0
   - `showDetails` (boolean) with a default value of false

2. Use `$state` to create a reactive variable for the count that can be updated
3. Display the name in a heading with `data-testid="name-display"`
4. Display the count value in a paragraph with `data-testid="count-display"`
5. Include a button with `data-testid="increment-button"` that increments the count by 1
6. If `showDetails` is true, display a div with `data-testid="details"` containing additional information about the props
7. If `showDetails` is false, this div should not be rendered

Example HTML structure:

```html
<div>
  <h1 data-testid="name-display">Hello, World!</h1>
  <p data-testid="count-display">Count: 0</p>
  <button data-testid="increment-button">Increment</button>

  <div data-testid="details">
    <p>Name is World</p>
    <p>Count is 0</p>
    <p>ShowDetails is true</p>
  </div>
</div>
```

Note: The details div should only be shown when showDetails is true.

Please implement this component using Svelte 5 syntax with the `$props` rune. Make sure you only return one component.
