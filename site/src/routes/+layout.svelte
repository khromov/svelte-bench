<script lang="ts">
  import "../app.css";
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import { Button } from "#lib/components/ui/button/index.js";
  import * as Tooltip from "#lib/components/ui/tooltip/index.js";
  import { Moon, Sun } from "@lucide/svelte";
  let { children }: { children: Snippet } = $props();
  let dark = $state(false);
  onMount(() => {
    dark = document.documentElement.classList.contains("dark");
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      if (!localStorage.getItem("themeIsManual")) {
        dark = media.matches;
        document.documentElement.classList.toggle("dark", dark);
      }
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  });
  function toggleTheme() {
    dark = !dark;
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
      localStorage.setItem("themeIsManual", "true");
    } catch {}
  }
</script>

<svelte:head
  ><title>SvelteBench — Svelte 5 model benchmark</title><meta
    name="description"
    content="Compare language models on real Svelte 5 component tests using HumanEval pass@k metrics."
  /></svelte:head
>
<Tooltip.Provider>
  <a href="#main" class="sr-only focus:not-sr-only">Skip to results</a>
  <header class="border-b">
    <nav aria-label="Main" class="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-4 sm:px-8">
      <a class="mr-auto text-xl font-semibold tracking-tight" href={resolve("/[...path]", { path: "" })}
        ><span class="text-primary">Svelte</span>Bench</a
      >
      <Button variant="ghost" href={resolve("/[...path]", { path: "benchmark-results-merged.html" })}
        >Leaderboard</Button
      >
      <Button variant="ghost" href={resolve("/[...path]", { path: "index.html" })}>Runs</Button>
      <Button variant="ghost" href={resolve("/[...path]", { path: "v1/index.html" })}>Legacy v1</Button>
      <Button variant="ghost" href="https://github.com/khromov/svelte-bench">GitHub</Button>
      <Button variant="outline" size="icon" aria-label="Toggle theme" onclick={toggleTheme}
        >{#if dark}<Sun size={16} />{:else}<Moon size={16} />{/if}</Button
      >
    </nav>
  </header>
  <main id="main" class="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">{@render children()}</main>
  <footer class="mx-auto max-w-6xl border-t px-4 py-6 text-sm text-muted-foreground sm:px-8">
    Svelte 5 components · HumanEval methodology · pass@k
  </footer>
</Tooltip.Provider>
