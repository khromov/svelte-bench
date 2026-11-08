import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import adapter from "@sveltejs/adapter-static";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      adapter: adapter({ strict: true }),
      paths: { base: (process.env.BASE_PATH ?? "/svelte-bench") as "" | `/${string}` },
      prerender: { crawl: false },
    }),
  ],
});
