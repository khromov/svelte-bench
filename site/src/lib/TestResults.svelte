<script lang="ts">
  import Cost from "#lib/Cost.svelte";
  import { summarizeCost } from "#lib/costs.js";
  import type { Result } from "#lib/results.js";
  import { nextSort, sortResults } from "#lib/results.js";
  import SortHeader from "#lib/SortHeader.svelte";
  import Samples from "#lib/Samples.svelte";
  import * as Table from "#lib/components/ui/table/index.js";
  let { results }: { results: Result[] } = $props();
  let sort = $state("test");
  const showCost = $derived(results.some((r) => r.provider.toLowerCase() !== "ollama"));
  const shown = $derived(sortResults(results, sort));
  const onsort = (key: string) => {
    sort = nextSort(sort, key);
  };
</script>

<Table.Root>
  <Table.Header
    ><Table.Row>
      <SortHeader label="Test" column="test" {sort} {onsort} />
      <SortHeader label="Correct" column="correct" {sort} {onsort} />
      <SortHeader label="pass@1" column="pass1" {sort} {onsort} />
      <SortHeader label="pass@10" column="pass10" {sort} {onsort} />
      {#if showCost}<SortHeader label="Cost (USD)" column="cost" {sort} {onsort} />{/if}
      <SortHeader label="Samples" column="samples" {sort} {onsort} />
    </Table.Row></Table.Header
  >
  <Table.Body
    >{#each shown as result (result)}<Table.Row>
        <Table.Cell class="font-medium">{result.testName}</Table.Cell>
        <Table.Cell>{result.numCorrect}/{result.numSamples}</Table.Cell>
        <Table.Cell>{(result.pass1 * 100).toFixed(1)}%</Table.Cell>
        <Table.Cell>{(result.pass10 * 100).toFixed(1)}%</Table.Cell>
        {#if showCost}<Table.Cell><Cost cost={summarizeCost([result])} /></Table.Cell>{/if}
        <Table.Cell><Samples {result} /></Table.Cell>
      </Table.Row>{/each}</Table.Body
  >
</Table.Root>
