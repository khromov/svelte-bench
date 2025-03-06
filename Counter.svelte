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
    <button onclick={decrement}>-</button>
    <span class="count">{count}</span>
    <button onclick={increment}>+</button>
  </div>
  
  <style>
    .counter {
      color: red;
    } 
  </style>