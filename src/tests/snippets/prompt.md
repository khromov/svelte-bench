# Snippet Component Task

Create a simple Svelte 5 component that demonstrates the basic use of snippets.

## Requirements:

1. Create a component with a hardcoded array of 3 book titles (strings) - "The Lord of the Rings", "To Kill a Mockingbird", and "1984"
2. Create a snippet called `title` that takes a book title string as a parameter
3. The snippet should display the book title in a `<span>` element with `data-testid="book-title"`
4. Use the `{@render ...}` syntax to render the snippet for each book title in a list
5. Each rendered title should be wrapped in a `<li>` element with `data-testid="book-item"`

## Example HTML structure:

```html
<ul>
  <li data-testid="book-item">The Lord of the Rings</li>
  <li data-testid="book-item">To Kill a Mockingbird</li>
  <li data-testid="book-item">1984</li>
</ul>
```

Please implement this component using Svelte 5 runes.
