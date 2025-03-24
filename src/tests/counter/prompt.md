# Counter Component Task

Create a Svelte 5 component called Counter that implements a simple counter with increment and decrement functionality.

## Requirements:

1. Use Svelte 5's `$state` for reactivity
2. The counter should start at 0
3. Include a decrement button with the `data-testid="decrement-button"` attribute
4. Include an increment button with the `data-testid="increment-button"` attribute
5. Display the current count with the `data-testid="count-value"` attribute
6. Clicking increment should increase the count by 1
7. Clicking decrement should decrease the count by 1
8. Style the counter with a CSS class "counter"

Example structure:

```html
<div class="counter">
  <button data-testid="decrement-button">-</button>
  <span data-testid="count-value">0</span>
  <button data-testid="increment-button">+</button>
</div>
```

Please implement this component using Svelte 5 syntax. Make sure you only return one component.
