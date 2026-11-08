import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import { fileURLToPath } from "node:url";
const file = (path: string) => fileURLToPath(new URL(path, import.meta.url));
export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  resolve: {
    alias: {
      "$app/state": file("./tests/state.svelte.ts"),
      "$app/navigation": file("./tests/navigation.ts"),
      "$app/paths": file("./tests/paths.ts"),
    },
  },
  test: { environment: "jsdom", include: ["tests/**/*.test.ts"], setupFiles: ["../vitest-setup.js"] },
});
