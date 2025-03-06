const fs = require("fs");
const { compile } = require("svelte/compiler");
const { JSDOM } = require("jsdom");

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
      runes: true, // Ensure runes mode is enabled for $state
    });

    // Set up JSDOM environment
    const dom = new JSDOM(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${css.code}</style>
        </head>
        <body>
          <div id="target"></div>
        </body>
      </html>
    `,
      {
        url: "http://localhost/",
        runScripts: "dangerously",
      }
    );

    // Create necessary globals for the Svelte runtime
    const globalObj = dom.window;
    globalObj.require = (name) => {
      if (name === "svelte") {
        return {
          mount: (component, opts) => {
            // Basic implementation of mount
            const target = opts.target;
            const instance = component(opts);
            return instance;
          },
          flushSync: (fn) => fn?.(),
        };
      }
    };

    // Inject and execute the compiled component code
    const script = dom.window.document.createElement("script");
    script.textContent = js.code;
    dom.window.document.head.appendChild(script);

    // Mount the component
    const mountScript = dom.window.document.createElement("script");
    mountScript.textContent = `
      const { mount } = require('svelte');
      const target = document.getElementById('target');
      const component = mount(Component, { target });
    `;
    dom.window.document.head.appendChild(mountScript);

    // Return the rendered HTML
    return {
      html: dom.window.document.getElementById("target").innerHTML,
      css: css.code,
    };
  } catch (error) {
    console.error("Error:", error);
    return { error: error.message };
  }
}

// Execute and display the result
compileAndRenderComponent().then((result) => {
  console.log("Rendered HTML:");
  console.log(result.html);
  console.log("\nGenerated CSS:");
  console.log(result.css);
});
