<script lang="ts">
  import Layout from "../src/routes/+layout.svelte";
  import Page from "../src/routes/[...path]/+page.svelte";
  import type { ComponentProps } from "svelte";
  let { data }: { data: ComponentProps<typeof Page>["data"] } = $props();
</script>

<Layout><Page {data} params={{ path: data.selected?.replace(".json", ".html") ?? "" }} form={null} /></Layout>
