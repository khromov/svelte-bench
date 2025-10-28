<svelte:options runes={true} />

<script>
  let number = $state(5);
  let doubled = $state(number * 2);

  $effect(() => {
    doubled = number * 2;
  });

  function increment() {
    number += 1;
  }
</script>

<div>
  <p data-testid="number-value">Number: {number}</p>
  <p data-testid="doubled-value">Doubled: {doubled}</p>
  <button data-testid="increment-button" onclick={increment}>Increment</button>
</div>
