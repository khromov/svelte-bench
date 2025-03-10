<svelte:options runes={true} />

<script>
  let colors = $state(["Red", "Green", "Blue"]);
  
  function makeUppercase() {
    colors = colors.map(color => color.toUpperCase());
  }
</script>

<div>
  <ul data-testid="colors-list">
    {#each colors as color, i}
      <li data-testid="color-{i}">{i + 1}: {color}</li>
    {/each}
  </ul>
  <button data-testid="uppercase-button" onclick={makeUppercase}>
    Make Uppercase
  </button>
</div>