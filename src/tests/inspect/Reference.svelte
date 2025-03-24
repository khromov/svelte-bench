<svelte:options runes={true} />

<script>
  let counter = $state(0);
  let message = $state("Hello");
  
  // Basic $inspect usage
  $inspect(counter);
  
  // Using $inspect(...).with
  $inspect(message).with((type, value) => {
    if (type === "update") {
      console.log(`Message updated to: ${value}`);
    }
  });
  
  // Using $inspect.trace
  $effect(() => {
    $inspect.trace("reactive-changes");
    // This effect runs whenever counter or message changes
    console.log(`Current values - Counter: ${counter}, Message: ${message}`);
  });
  
  function incrementCounter() {
    counter++;
  }
</script>

<div>
  <div>
    <p data-testid="counter-value">Counter: {counter}</p>
    <button data-testid="increment-button" onclick={incrementCounter}>Increment</button>
  </div>
  <div>
    <p data-testid="message-value">Message: {message}</p>
    <input data-testid="message-input" type="text" bind:value={message} />
  </div>
</div>

<style>
  div {
    margin-bottom: 1rem;
  }
  
  button {
    padding: 0.5rem;
    background-color: #e2e8f0;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
  }
  
  input {
    padding: 0.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.25rem;
  }
</style>