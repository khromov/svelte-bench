<script>
  let count = $state(0);

  function increment() {
    count++;
  }

  function decrement() {
    count--;
  }
</script>

<div class="counter">
  <button data-testid="decrement-button" onclick={decrement}>-</button>
  <span data-testid="count-value" class="count">{count}</span>
  <button data-testid="increment-button" onclick={increment}>+</button>
</div>

<style>
  .counter {
    color: red;
  } 
</style>