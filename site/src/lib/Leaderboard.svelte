<script lang="ts">
  import type { Model } from "#lib/results.js";
  import { formatDuration, formatTps, responseTitle } from "#lib/results.js";
  import * as Table from "#lib/components/ui/table/index.js";
  import * as Tooltip from "#lib/components/ui/tooltip/index.js";
  import { Button } from "#lib/components/ui/button/index.js";
  import { Progress } from "#lib/components/ui/progress/index.js";
  let {
    models,
    local,
    sort,
    onsort,
    maxTps,
    showTps,
    showTime,
  }: {
    models: Model[];
    local: boolean;
    sort: string;
    onsort: (key: string) => void;
    maxTps: number;
    showTps: boolean;
    showTime: boolean;
  } = $props();
  const ariaSort = (key: string): "ascending" | "descending" | "none" =>
    sort.startsWith(key) ? (sort.endsWith("asc") || sort === "time" ? "ascending" : "descending") : "none";
</script>

<div class="overflow-hidden rounded-xl border">
  <Table.Root>
    <Table.Header
      ><Table.Row>
        <Table.Head class="w-14">Rank</Table.Head><Table.Head>Model</Table.Head>
        <Table.Head class="w-40"
          ><Button variant="ghost" size="sm" disabled={!local} onclick={() => onsort("score")}>Score ↓</Button
          ></Table.Head
        >
        {#if showTps}<Table.Head aria-sort={ariaSort("tps")}
            ><Button variant="ghost" size="sm" disabled={!local} onclick={() => onsort("tps")}
              >Speed {sort.startsWith("tps") ? (sort.endsWith("asc") ? "↑" : "↓") : ""}</Button
            ></Table.Head
          >{/if}
        {#if showTime}<Table.Head aria-sort={ariaSort("time")}
            ><Button variant="ghost" size="sm" disabled={!local} onclick={() => onsort("time")}
              >Avg. response {sort.startsWith("time") ? (sort.endsWith("desc") ? "↓" : "↑") : ""}</Button
            ></Table.Head
          >{/if}
      </Table.Row></Table.Header
    >
    <Table.Body>
      {#each models as model (model.key)}
        <Table.Row>
          <Table.Cell class="font-mono text-muted-foreground">{model.rank}</Table.Cell>
          <Table.Cell class="max-w-52 whitespace-normal sm:max-w-96">
            {#if model.modelUrl}<a
                class="break-words font-medium underline-offset-4 hover:underline"
                href={model.modelUrl}
                target="_blank"
                rel="noreferrer">{model.model} ↗</a
              >{:else}<span class="break-words font-medium">{model.model}</span>{/if}
            <div class="mt-1 text-xs text-muted-foreground">{model.provider}</div>
          </Table.Cell>
          <Table.Cell
            ><div class="mb-2 font-mono font-semibold">{model.score.toFixed(1)}%</div>
            <Progress value={model.score} aria-label={`${model.model} pass@1`} class="max-w-28" /></Table.Cell
          >
          {#if showTps}<Table.Cell
              ><div class="font-mono">{model.tps === null ? "—" : `${formatTps(model.tps)} tok/s`}</div>
              {#if model.tps}<Progress
                  value={Math.max(2, Math.round((model.tps / maxTps) * 100))}
                  aria-label={`${model.model} relative generation speed`}
                  class="mt-2 max-w-24 [&_[data-slot=progress-indicator]]:bg-muted-foreground"
                />{/if}</Table.Cell
            >{/if}
          {#if showTime}<Table.Cell>
              {#if model.tokenTimes}<Tooltip.Root
                  ><Tooltip.Trigger class="text-left font-mono underline decoration-dotted underline-offset-4"
                    >{model.tokenTimes.avgResponseSeconds == null
                      ? `${Math.round(model.tokenTimes.avgOutputTokens).toLocaleString("en-US")} tok`
                      : `~${formatDuration(model.tokenTimes.avgResponseSeconds)}*`}</Tooltip.Trigger
                  ><Tooltip.Content class="max-w-80">{responseTitle(model)}</Tooltip.Content></Tooltip.Root
                >{:else}—{/if}
            </Table.Cell>{/if}
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
</div>
