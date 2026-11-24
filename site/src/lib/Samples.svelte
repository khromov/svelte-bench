<script lang="ts">
  import type { Result } from "#lib/results.js";
  import * as Dialog from "#lib/components/ui/dialog/index.js";
  import * as Accordion from "#lib/components/ui/accordion/index.js";
  import { Button } from "#lib/components/ui/button/index.js";
  import { Badge } from "#lib/components/ui/badge/index.js";
  let { result }: { result: Result } = $props();
</script>

<Dialog.Root>
  <Dialog.Trigger
    >{#snippet child({ props })}<Button variant="outline" size="sm" {...props}>Samples ({result.numSamples})</Button
      >{/snippet}</Dialog.Trigger
  >
  <Dialog.Content class="max-h-[85dvh] overflow-y-auto sm:max-w-4xl">
    <Dialog.Header>
      <Dialog.Title>{result.testName}</Dialog.Title>
      <Dialog.Description
        >{result.modelId} · {result.numCorrect}/{result.numSamples} correct · pass@1 {(result.pass1 * 100).toFixed(1)}%
        · pass@10 {(result.pass10 * 100).toFixed(1)}%</Dialog.Description
      >
    </Dialog.Header>
    <Accordion.Root type="multiple">
      {#each result.samples ?? [] as sample (sample.index)}
        <Accordion.Item value={String(sample.index)}>
          <Accordion.Trigger
            >Sample {sample.index + 1}
            <Badge
              variant="secondary"
              class={sample.success ? "text-green-700 dark:text-green-400" : "text-destructive"}
              >{sample.success ? "Passed" : "Failed"}</Badge
            ></Accordion.Trigger
          >
          <Accordion.Content>
            {#if sample.temperature !== undefined}<p class="mb-3 text-muted-foreground">
                Temperature: {sample.temperature}
              </p>{/if}
            {#if sample.errors?.length}<pre
                class="mb-4 rounded-md bg-destructive/10 p-4 text-destructive">{sample.errors.join("\n")}</pre>{/if}
            <pre class="rounded-md bg-muted p-4 text-xs leading-relaxed"><code>{sample.code}</code></pre>
          </Accordion.Content>
        </Accordion.Item>
      {/each}
    </Accordion.Root>
  </Dialog.Content>
</Dialog.Root>
