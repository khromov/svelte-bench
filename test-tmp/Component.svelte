<svelte:options runes={true} />

<script>
  let text = $state("Hello world");
  
  // Basic $inspect usage
  $inspect(text);
  
  // Using $inspect(...).with
  $inspect(text).with((type, value) => {
    if (type === "update") {
      console.log(`Text updated to: "${value}"`);
    }
  });
  
  // Using $inspect.trace inside an effect
  $effect(() => {
    $inspect.trace("text-changes");
    // This will run whenever text changes
    console.log(`The text is now: "${text}" (${text.length} characters)`);
  });
  
  // Derived value for character count (not necessary for $inspect demo, but shows a common use case)
  let charCount = $derived(text.length);
</script>

<div class="container">
  <div class="input-group">
    <label for="text-input">Enter some text:</label>
    <input 
      id="text-input"
      data-testid="text-input" 
      type="text" 
      bind:value={text} 
    />
  </div>
  
  <p data-testid="text-value">Current text: "{text}"</p>
  <p data-testid="char-count">Character count: {charCount}</p>
</div>