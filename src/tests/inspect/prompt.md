# $inspect Rune Component Task

Create a Svelte 5 component that demonstrates the `$inspect` rune functionality.

## Requirements:

1. Use Svelte 5's `$state` for reactivity
2. Create a counter starting at 0 and a message string starting with "Hello"
3. Use basic `$inspect` to log the counter value
4. Implement `$inspect(...).with` to track updates to the message with a custom callback
5. Implement `$inspect.trace()` inside an effect that runs when either value changes
6. Include a button to increment the counter with `data-testid="increment-button"`
7. Include an input field to update the message with `data-testid="message-input"`
8. Display both the counter and message in the component

Elements should have these data-testid attributes:

- "counter-value" for displaying the counter
- "message-value" for displaying the message
- "increment-button" for the increment button
- "message-input" for the message input field

Example structure:

```html
<div>
  <div>
    <p data-testid="counter-value">Counter: {counter}</p>
    <button data-testid="increment-button">Increment</button>
  </div>
  <div>
    <p data-testid="message-value">Message: {message}</p>
    <input data-testid="message-input" type="text" bind:value="{message}" />
  </div>
</div>
```

Please implement this component using Svelte 5 runes.
