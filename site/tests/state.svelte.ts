export const page = $state<{ url: URL; shallow: { url: URL } | null }>({
  url: new URL("http://localhost/svelte-bench/benchmark-results-merged.html"),
  shallow: null,
});
