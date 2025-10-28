<svelte:options runes={true} />

<script>
  let characters = $state(["Jerry", "Elaine", "Kramer"]);

  function addGeorge() {
    characters = [...characters, "George"];
  }
</script>

<div>
  <ul data-testid="characters-list">
    {#each characters as character}
      <li data-testid="character">{character}</li>
    {/each}
  </ul>
  <button data-testid="add-george-button" onclick={addGeorge}> Add George </button>
</div>
