import { compile } from "svelte/compiler";
import { JSDOM } from "jsdom";

async function compileAndRenderComponent() {
  try {
    // Load the component source
    const source = `
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
`;

    // Compile the component with client-side rendering
    const { js, css } = compile(source, {
      generate: "client",
      dev: false,
      runes: true,
    });

    console.log("Compiled component:");
    console.log(js.code);
    console.log(css);
  } catch (err) {
    console.error("Error compiling component:", err);
  }
}

compileAndRenderComponent();
