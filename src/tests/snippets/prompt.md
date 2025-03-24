# Snippet Component Task

Create a simple Svelte 5 component that demonstrates the basic use of snippets.

## Requirements:

1. Create a component with a hardcoded array of 3 book titles (strings)
2. Create a snippet called `title` that takes a book title string as a parameter
3. The snippet should display the book title in a `<span>` element with `data-testid="book-title"`
4. Use the `{@render ...}` syntax to render the snippet for each book title in a list
5. Each rendered title should be wrapped in a `<li>` element with `data-testid="book-item"`

## Example structure:

```svelte
<script>
  // Book titles array would go here
</script>

{#snippet title(bookTitle)}
  <!-- Display the book title in a span -->
{/snippet}

<ul>
  {#each bookTitles as bookTitle}
    <li data-testid="book-item">
      {@render title(bookTitle)}
    </li>
  {/each}
</ul>
```

Please implement this component using Svelte 5 runes.
