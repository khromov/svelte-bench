<svelte:options runes={true} />

<script>
  let text = $state("");
  
  let textStats = $derived.by(() => {
    const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    const charCount = text.length;
    const isLongText = wordCount > 15;
    
    return {
      wordCount,
      charCount,
      isLongText
    };
  });
  
  function clearText() {
    text = "";
  }
</script>

<div>
  <input 
    data-testid="text-input" 
    type="text" 
    bind:value={text} 
    placeholder="Type some text..."
  />
  <button 
    data-testid="clear-button" 
    onclick={clearText}
  >
    Clear
  </button>
  
  <div>
    <p data-testid="word-count">Words: {textStats.wordCount}</p>
    <p data-testid="char-count">Characters: {textStats.charCount}</p>
    <p data-testid="length-indicator">
      Status: {textStats.isLongText ? "Long text" : "Short text"}
    </p>
  </div>
</div>

<style>
  div {
    margin: 1rem 0;
  }
  
  input {
    padding: 0.5rem;
    width: 300px;
  }
  
  button {
    margin-left: 0.5rem;
    padding: 0.5rem 1rem;
  }
</style>