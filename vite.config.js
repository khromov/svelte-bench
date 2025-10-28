import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";

export default defineConfig({
  plugins: [
    svelte({
      hot: !process.env.VITEST,
      compilerOptions: {
        // Enable runes mode for Svelte 5
        runes: true,
      },
    }),
    svelteTesting(),
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest-setup.js"],
    server: {
      deps: {
        inline: ["@testing-library/svelte"],
      },
    },
  },
  // Ensure Svelte files in node_modules are transformed
  optimizeDeps: {
    exclude: ["@testing-library/svelte"],
  },
  ssr: {
    noExternal: ["@testing-library/svelte"],
  },
});
