<script lang="ts">
  import { costSource, formatUsd, type CostSummary } from "#lib/costs.js";
  let { cost }: { cost: CostSummary } = $props();
</script>

{#if cost.local}
  <span class="text-muted-foreground" aria-label="API cost does not apply to local models">—</span>
{:else if cost.status === "missing"}
  <span class="text-xs text-muted-foreground">Not recorded</span>
{:else if cost.status === "unavailable"}
  <span class="text-xs text-muted-foreground">Unavailable</span>
{:else}
  <div class="min-w-24">
    <span class="font-mono">{formatUsd(cost.knownUsd)}</span>
    <div class="mt-1 text-xs text-muted-foreground">
      {costSource(cost)}{cost.status === "partial" ? " · Partial" : ""}
    </div>
  </div>
{/if}
