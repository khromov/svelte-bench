<script lang="ts">
  import * as Table from "#lib/components/ui/table/index.js";
  import { Button } from "#lib/components/ui/button/index.js";
  import { sortDirection } from "#lib/results.js";
  let {
    label,
    column,
    sort,
    onsort,
  }: {
    label: string;
    column: string;
    sort: string;
    onsort: (key: string) => void;
  } = $props();
  const active = $derived(sort.split("-")[0] === column);
  const direction = $derived(sortDirection(sort));
</script>

<Table.Head aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
  <Button variant="ghost" size="sm" onclick={() => onsort(column)} aria-label={`Sort by ${label}`}>
    {label} <span aria-hidden="true">{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span>
  </Button>
</Table.Head>
