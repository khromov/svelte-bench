<svelte:options runes={true} />

<script>
  const { name = "World", count: initialCount = 0, showDetails = false } = $props();
  let countValue = $state(initialCount);
  
  function increment() {
    countValue = countValue + 1;
  }
</script>

<div>
  <h1 data-testid="name-display">Hello, {name}!</h1>
  <p data-testid="count-display">Count: {countValue}</p>
  <button data-testid="increment-button" onclick={increment}>Increment</button>
  
  {#if showDetails}
    <div data-testid="details">
      <p>Name is {name}</p>
      <p>Count is {countValue}</p>
      <p>ShowDetails is {showDetails}</p>
    </div>
  {/if}
</div>

<style>
  div {
    font-family: Arial, sans-serif;
    padding: 1rem;
  }
  
  h1 {
    color: #333;
  }
  
  button {
    background-color: #4CAF50;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:hover {
    background-color: #45a049;
  }
</style>
