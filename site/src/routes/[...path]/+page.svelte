<script lang="ts">
  import { onMount, tick } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { resolve, asset } from "$app/paths";
  import type { PageProps } from "./$types.js";
  import { models, modelAnchor, visibleModels, formatTps, formatDuration } from "#lib/results.js";
  import * as Tabs from "#lib/components/ui/tabs/index.js";
  import * as Accordion from "#lib/components/ui/accordion/index.js";
  import * as Table from "#lib/components/ui/table/index.js";
  import { Input } from "#lib/components/ui/input/index.js";
  import { Button } from "#lib/components/ui/button/index.js";
  import { Badge } from "#lib/components/ui/badge/index.js";
  import Leaderboard from "#lib/Leaderboard.svelte";
  import Cost from "#lib/Cost.svelte";
  import { summarizeCost } from "#lib/costs.js";
  import Samples from "#lib/Samples.svelte";
  let { data }: PageProps = $props();
  let ready = $state(false);
  onMount(() => {
    ready = true;
  });
  const url = $derived(page.shallow?.url ?? page.url);
  const search = $derived(ready ? (url.searchParams.get("search") ?? "") : "");
  const tab = $derived(ready && url.searchParams.get("tab") === "local" ? "local" : "all");
  const sort = $derived(ready ? (url.searchParams.get("sort") ?? "score") : "score");
  const all = $derived(models(data.results, data.legacy));
  const shown = $derived(visibleModels(all, search, tab, sort));
  const target = $derived(ready ? shown.find((m) => `#${modelAnchor(m.provider, m.model)}` === url.hash) : undefined);
  $effect(() => {
    if (!target) return;
    const id = modelAnchor(target.provider, target.model);
    // The provider and model panels must mount before the browser can scroll to the anchor.
    let cancelled = false;
    void tick().then(() => {
      if (!cancelled) document.getElementById(id)?.scrollIntoView({ block: "start" });
    });
    return () => {
      cancelled = true;
    };
  });
  const merged = $derived(data.selected?.includes("merged"));
  const prefix = $derived(data.legacy ? "v1/" : "");
  const providers = $derived([...new Set(shown.map((model) => model.provider))].sort((a, b) => a.localeCompare(b)));
  let expandedProviders = $derived(search ? providers : target ? [target.provider] : []);
  let expandedModels = $derived(search ? shown.map((model) => model.key) : target ? [target.key] : []);
  const contexts = $derived(
    data.results
      .filter((r) => r.context?.used)
      .map((r) => r.context!)
      .filter((c, i, a) => a.findIndex((v) => v.filename === c.filename && v.content === c.content) === i),
  );
  function link(name: string) {
    return resolve("/[...path]", { path: prefix + name.replace(/\.json$/, ".html") });
  }
  function download(name: string) {
    return asset((prefix + name) as Parameters<typeof asset>[0]);
  }
  function update(key: string, value: string) {
    const next = new URL(url.href);
    if (value && !(key === "tab" && value === "all") && !(key === "sort" && value === "score"))
      next.searchParams.set(key, value);
    else next.searchParams.delete(key);
    void goto(next, { shallow: true, replace: true, reset: false });
  }
  function sortBy(key: string) {
    if (key === "score") return update("sort", "score");
    const first = key === "time" ? "asc" : "desc";
    const current = sort.split("-");
    const direction = current[0] === key ? ((current[1] ?? first) === "asc" ? "desc" : "asc") : first;
    update("sort", direction === first ? key : `${key}-${direction}`);
  }
  function openModel(hash: string) {
    if (hash === url.hash && target) {
      expandedProviders = [...new Set([...expandedProviders, target.provider])];
      expandedModels = [...new Set([...expandedModels, target.key])];
      void tick().then(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" }));
      return;
    }
    const next = new URL(url.href);
    next.hash = hash;
    void goto(next, { reset: false });
  }
</script>

<svelte:head
  ><title
    >{data.legacy ? "Legacy v1 · " : ""}{data.selected ? (merged ? "Leaderboard" : "Benchmark run") : "Results"} · SvelteBench</title
  ></svelte:head
>
{#if data.legacy}<aside role="note" class="mb-8 rounded-lg border border-amber-600/40 bg-amber-500/10 p-4 text-sm">
    <strong>Legacy v1 results</strong>
    <p class="mt-1">
      These historical results used the original test suite. Prompt formatting issues may affect their accuracy. Compare
      them separately from current results.
    </p>
  </aside>{/if}
<div class="mb-6 flex flex-wrap items-end justify-between gap-4">
  <div>
    <p class="mb-3 text-sm font-medium text-muted-foreground">SVELTE 5 · HUMANEVAL</p>
    <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
      {data.selected ? (merged ? "Model leaderboard" : "Benchmark run") : "Benchmark results"}
    </h1>
    <p class="mt-3 max-w-2xl break-all text-sm text-muted-foreground">
      {merged ? "Compare models on real Svelte 5 component tests." : (data.selected ?? "No results available yet.")}
    </p>
  </div>
  {#if data.selected}<Button variant="outline" href={download(data.selected)} download>Download JSON ↓</Button>{/if}
</div>
{#if !data.selected}
  <p>No benchmark results found.</p>
{:else}
  {#each contexts as context (context)}<Accordion.Root type="single" class="mb-6 rounded-lg border px-4"
      ><Accordion.Item value="context" class="border-0"
        ><Accordion.Trigger>Context file: {context.filename ?? "Additional context"}</Accordion.Trigger
        ><Accordion.Content
          ><pre class="max-h-96 overflow-y-auto text-xs">{context.content ?? ""}</pre></Accordion.Content
        ></Accordion.Item
      ></Accordion.Root
    >{/each}
  {#snippet resultsPanel()}
    {#if merged}<Leaderboard
        models={shown}
        local={tab === "local"}
        {sort}
        onsort={sortBy}
        onmodel={openModel}
        maxTps={Math.max(0, ...all.map((m) => m.tps ?? 0))}
        showTps={tab === "local" && all.some((m) => m.tps !== null)}
        showTime={tab === "local" && all.some((m) => m.tokenTimes !== null)}
      />{/if}
    {#if !shown.length}<p class="rounded-lg border p-8 text-center text-muted-foreground">No matching models.</p>{/if}
    {#if tab === "local" && all.some((m) => m.tps || m.tokenTimes)}<p
        class="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground"
      >
        * Local models ran through Ollama on an AMD Ryzen 5 7640HS processor (50W TDP) with Radeon 760M RDNA3 graphics.
        Speed is the generation rate on that hardware. Estimated response time uses average output tokens, including
        thinking, divided by speed, with one sample per test.
      </p>{/if}
    {#if tab !== "local" && shown.some((m) => m.provider.toLowerCase() !== "ollama")}
      <p class="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
        Experimental costs cover recorded samples and returned retry attempts, in USD. API reported charges and
        documented-rate estimates are labeled separately. Partial amounts exclude unknown charges. “Not recorded” means
        usage was not saved, not zero cost. Validation probes and requests without returned usage are excluded.
      </p>
    {/if}
    <section class="mt-12">
      <h2 class="mb-4 text-xl font-semibold tracking-tight">Results by provider</h2>
      <Accordion.Root type="multiple" bind:value={expandedProviders}>
        {#each providers as provider (provider)}<Accordion.Item value={provider}
            ><Accordion.Trigger
              ><span class="text-base"
                >{provider}
                <Badge variant="secondary">{shown.filter((m) => m.provider === provider).length} models</Badge></span
              ></Accordion.Trigger
            ><Accordion.Content>
              <Accordion.Root type="multiple" bind:value={expandedModels}>
                {#each shown
                  .filter((m) => m.provider === provider)
                  .sort((a, b) => a.model.localeCompare(b.model)) as model (model.key)}<Accordion.Item
                    value={model.key}
                    id={modelAnchor(model.provider, model.model)}
                    class="scroll-mt-6"
                    ><Accordion.Trigger
                      ><span class="min-w-0 break-all pr-3"
                        >{model.model}
                        <span class="ml-2 font-mono text-muted-foreground">{model.score.toFixed(1)}%</span></span
                      ></Accordion.Trigger
                    ><Accordion.Content>
                      <div class="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        {#if model.modelUrl}<a href={model.modelUrl} class="underline" target="_blank" rel="noreferrer"
                            >Model details ↗</a
                          >{/if}{#if model.tps}<span>{formatTps(model.tps)} tok/s</span
                          >{/if}{#if model.tokenTimes?.avgResponseSeconds != null}<span
                            >~{formatDuration(model.tokenTimes.avgResponseSeconds)} / response</span
                          >{/if}
                      </div>
                      {#if model.provider.toLowerCase() !== "ollama"}
                        <div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
                          <span>Run cost (USD)</span><Cost cost={model.cost} />
                        </div>
                      {/if}
                      <Table.Root
                        ><Table.Header
                          ><Table.Row
                            ><Table.Head>Test</Table.Head><Table.Head>Correct</Table.Head><Table.Head>pass@1</Table.Head
                            ><Table.Head>pass@10</Table.Head>{#if model.provider.toLowerCase() !== "ollama"}<Table.Head
                                >Cost (USD)</Table.Head
                              >{/if}<Table.Head>Samples</Table.Head></Table.Row
                          ></Table.Header
                        ><Table.Body
                          >{#each model.tests as result (result)}<Table.Row
                              ><Table.Cell class="font-medium">{result.testName}</Table.Cell><Table.Cell
                                >{result.numCorrect}/{result.numSamples}</Table.Cell
                              ><Table.Cell>{(result.pass1 * 100).toFixed(1)}%</Table.Cell><Table.Cell
                                >{(result.pass10 * 100).toFixed(1)}%</Table.Cell
                              >{#if model.provider.toLowerCase() !== "ollama"}<Table.Cell
                                  ><Cost cost={summarizeCost([result])} /></Table.Cell
                                >{/if}<Table.Cell><Samples {result} /></Table.Cell></Table.Row
                            >{/each}</Table.Body
                        ></Table.Root
                      >
                    </Accordion.Content></Accordion.Item
                  >{/each}
              </Accordion.Root>
            </Accordion.Content></Accordion.Item
          >{/each}
      </Accordion.Root>
    </section>
  {/snippet}
  <Tabs.Root class="min-w-0" value={tab} onValueChange={(value) => update("tab", value)}>
    <Tabs.List
      ><Tabs.Trigger value="all">All models <span class="ml-1 text-xs">{all.length}</span></Tabs.Trigger><Tabs.Trigger
        value="local"
        >Local models <span class="ml-1 text-xs">{all.filter((m) => m.provider.toLowerCase() === "ollama").length}</span
        ></Tabs.Trigger
      ></Tabs.List
    >
    <div class="mb-4 mt-3 flex flex-wrap items-center justify-between gap-4">
      <div class="flex w-full items-center gap-2 sm:w-80">
        <Input
          aria-label="Search models and providers"
          placeholder="Search models or providers…"
          value={search}
          oninput={(event) => update("search", event.currentTarget.value)}
        />{#if search}<Button variant="ghost" onclick={() => update("search", "")}>Clear</Button>{/if}
      </div>
      <p aria-live="polite" class="ml-auto text-right text-sm text-muted-foreground">
        {shown.length} models{merged ? " · Average pass@1 scores" : ""}
      </p>
    </div>
    <Tabs.Content class="min-w-0" value="all"
      >{#if tab === "all"}{@render resultsPanel()}{/if}</Tabs.Content
    >
    <Tabs.Content class="min-w-0" value="local"
      >{#if tab === "local"}{@render resultsPanel()}{/if}</Tabs.Content
    >
  </Tabs.Root>
  <section class="mt-12" aria-label="Historical benchmark runs">
    <Accordion.Root type="single"
      ><Accordion.Item value="runs"
        ><Accordion.Trigger
          ><span class="text-lg"
            >Raw results <Badge variant="secondary">{data.files.filter((n) => !n.includes("merged")).length} runs</Badge
            ></span
          ></Accordion.Trigger
        ><Accordion.Content
          ><ul class="divide-y">
            {#each data.files.filter((n) => !n.includes("merged")) as name (name)}<li
                class="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <a class="min-w-0 break-all text-sm hover:underline" href={link(name)}>{name.replace(".json", "")}</a
                ><Button size="sm" variant="outline" href={download(name)} download>JSON ↓</Button>
              </li>{/each}
          </ul></Accordion.Content
        ></Accordion.Item
      ></Accordion.Root
    >
  </section>
{/if}
