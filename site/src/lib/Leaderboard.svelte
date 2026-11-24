<script lang="ts">
  import SortHeader from "#lib/SortHeader.svelte";
  import type { Model } from "#lib/results.js";
  import { modelAnchor, formatDuration, formatTps, responseTitle } from "#lib/results.js";
  import * as Table from "#lib/components/ui/table/index.js";
  import * as Tooltip from "#lib/components/ui/tooltip/index.js";
  import { Progress } from "#lib/components/ui/progress/index.js";
  let {
    models,
    local,
    sort,
    onsort,
    onmodel,
    maxTps,
    showTps,
    showTime,
  }: {
    models: Model[];
    local: boolean;
    sort: string;
    onsort: (key: string) => void;
    onmodel: (hash: string) => void;
    maxTps: number;
    showTps: boolean;
    showTime: boolean;
  } = $props();
</script>

<div class="overflow-hidden rounded-xl border">
  <Table.Root class={local ? "min-w-[44rem]" : ""}>
    <Table.Header
      ><Table.Row>
        <SortHeader label="Rank" column="rank" {sort} {onsort} />
        <SortHeader label="Model" column="model" {sort} {onsort} />
        <SortHeader label="Score" column="score" {sort} {onsort} />
        {#if showTps}<SortHeader label="Speed" column="tps" {sort} {onsort} />{/if}
        {#if showTime}<SortHeader label="Avg. response" column="time" {sort} {onsort} />{/if}
      </Table.Row></Table.Header
    >
    <Table.Body>
      {#each models as model (model.key)}
        <Table.Row>
          <Table.Cell class="font-mono text-muted-foreground">{model.rank}</Table.Cell>
          <Table.Cell class="whitespace-normal">
            <a
              class="wrap-anywhere font-medium underline-offset-4 hover:underline"
              href={`#${modelAnchor(model.provider, model.model)}`}
              onclick={(event) => {
                if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                onmodel(`#${modelAnchor(model.provider, model.model)}`);
              }}>{model.model}</a
            >
            {#if model.modelUrl}<a
                href={model.modelUrl}
                target="_blank"
                rel="noreferrer"
                class="ml-2 text-xs underline"
                aria-label={`Open model page for ${model.model}`}>Model page ↗</a
              >{/if}
            <div class="mt-1 text-xs text-muted-foreground">{model.provider}</div>
          </Table.Cell>
          <Table.Cell
            ><div class="flex items-center gap-3">
              <span class="w-14 shrink-0 font-mono font-semibold">{model.score.toFixed(1)}%</span>
              <Progress value={model.score} aria-label={`${model.model} pass@1`} class="min-w-12 flex-1" />
            </div></Table.Cell
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
