# Snippets Component Task

Create a Svelte 5 component called `Card` that demonstrates the use of snippets, Svelte 5's replacement for slots.

## Requirements:

1. Create a `Card` component that:

   - Accepts content via snippets
   - Has a main content area
   - Has optional header and footer sections
   - Allows customization of the card's appearance

2. The `Card` component should accept the following props:

   - `title` (string, optional) - If provided, adds a default header with this title
   - `width` (string, optional, defaults to "300px") - Controls the card width
   - `variant` (string, optional, can be "default", "primary", or "warning", defaults to "default") - Changes the card's color scheme

3. The `Card` component should implement:

   - A default content snippet for the main card content
   - A header snippet that overrides the default title if provided
   - A footer snippet
   - Support for passing parameters to snippets

4. Create a test component that:
   - Uses the `Card` component with various configurations
   - Demonstrates passing different snippets to the component
   - Shows how to override the default title using the header snippet
   - Demonstrates parameter passing to snippets

Example structure for the Card component:

```html
<div class="card card-{variant}" style="width: {width}">
  <!-- Show either the header snippet or the default title -->
  <div class="card-header">
    {#if header} {@render header()} {:else if title}
    <h3>{title}</h3>
    {/if}
  </div>

  <!-- Main content area -->
  <div class="card-body">{@render children()}</div>

  <!-- Optional footer -->
  {#if footer}
  <div class="card-footer">{@render footer()}</div>
  {/if}
</div>
```

Example usage:

```html
<Card title="Default Card" variant="primary">
  <p>This is the main content of the card.</p>

  {#snippet footer()}
  <p>Card footer content</p>
  {/snippet}
</Card>

<Card variant="warning" width="400px">
  {#snippet header()}
  <h2 class="custom-header">Custom Header</h2>
  {/snippet}

  <p>Card with custom header.</p>
</Card>
```

Please implement this component using Svelte 5 runes and the new snippets syntax. Make sure you only return one component.
