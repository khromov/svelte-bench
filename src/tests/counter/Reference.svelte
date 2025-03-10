<script>
    let count = $state(0);
  
    function increment() {
      count++;
    }
  
    function decrement() {
      count--;
    }
  </script>
  
  <div class="counter"> <!-- TODO: Verify runes mode -->
    <button data-testid="decrement-button" on:click={decrement}>-</button>
    <span data-testid="count-value">{count}</span>
    <button data-testid="increment-button" on:click={increment}>+</button>
  </div>
  
  <style>
    .counter {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
    }
  
    button {
      background-color: #e2e8f0;
      border: none;
      border-radius: 0.25rem;
      padding: 0.5rem 1rem;
      font-size: 1.25rem;
      cursor: pointer;
    }
  
    button:hover {
      background-color: #cbd5e0;
    }
  
    span {
      font-size: 1.5rem;
      font-weight: bold;
      min-width: 2rem;
      text-align: center;
    }
  </style>