<svelte:options runes={true} />

<script>
  const bookTitles = [
    "The Lord of the Rings",
    "To Kill a Mockingbird",
    "1984"
  ];
</script>

{#snippet title(bookTitle)}
  <span data-testid="book-title">{bookTitle}</span>
{/snippet}

<ul>
  {#each bookTitles as bookTitle}
    <li data-testid="book-item">
      {@render title(bookTitle)}
    </li>
  {/each}
</ul>

<style>
  ul {
    list-style-type: none;
    padding: 0;
  }
  
  li {
    margin: 0.5rem 0;
    padding: 0.5rem;
    border-bottom: 1px solid #eee;
  }
  
  span {
    font-weight: bold;
  }
</style>