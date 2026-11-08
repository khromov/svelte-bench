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
  const mergedFile = $derived(data.files.find((name) => name.includes("merged")));
  const providers = $derived([...new Set(shown.map((model) => model.provider))].sort((a, b) => a.localeCompare(b)));
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
    const next = new URL(url.href);
    next.hash = hash;
    void goto(next, { shallow: true, reset: false });
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
<div class="mb-8 flex flex-wrap items-end justify-between gap-4">
  <div>
    <p class="mb-3 text-sm font-medium text-muted-foreground">SVELTE 5 · HUMANEVAL</p>
    <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
      {data.selected ? (merged ? "Model leaderboard" : "Benchmark run") : "Benchmark results"}
    </h1>
    <p class="mt-3 max-w-2xl break-all text-sm text-muted-foreground">
      {data.selected ?? "Explore the latest results and every individual benchmark run."}
    </p>
  </div>
  {#if data.selected}<Button variant="outline" href={download(data.selected)} download>Download JSON ↓</Button>{/if}
</div>
{#if !data.selected}
  {#if mergedFile}<section class="mb-8 rounded-xl border bg-card p-6 sm:p-8">
      <Badge variant="secondary">Latest results</Badge>
      <h2 class="mt-4 text-2xl font-semibold tracking-tight">Compare the models</h2>
      <p class="my-4 text-muted-foreground">The most recent result for each model, merged into one leaderboard.</p>
      <div class="flex flex-wrap gap-3">
        <Button href={link(mergedFile)}>View leaderboard →</Button><Button
          variant="outline"
          href={download(mergedFile)}
          download>Download JSON</Button
        >
      </div>
    </section>{/if}
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
  {#if !data.files.length}<p>No benchmark results found.</p>{/if}
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
    <p aria-live="polite" class="mb-4 text-sm text-muted-foreground">
      {shown.length} models{merged ? " · Average pass@1 scores" : ""}
    </p>
    {#if merged}<Leaderboard
        models={shown}
        local={tab === "local"}
        {sort}
        onsort={sortBy}
        onmodel={openModel}
        maxTps={Math.max(0, ...all.map((m) => m.tps ?? 0))}
        showTps={all.some((m) => m.tps !== null)}
        showTime={all.some((m) => m.tokenTimes !== null)}
      />{/if}
    {#if !shown.length}<p class="rounded-lg border p-8 text-center text-muted-foreground">No matching models.</p>{/if}
    {#if all.some((m) => m.tps || m.tokenTimes)}<p class="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
        * Local models ran through Ollama on an AMD Ryzen 5 7640HS processor (50W TDP) with Radeon 760M RDNA3 graphics.
        Speed is the generation rate on that hardware. Estimated response time uses average output tokens, including
        thinking, divided by speed, with one sample per test.
      </p>{/if}
    <section class="mt-12">
      <h2 class="mb-4 text-xl font-semibold tracking-tight">Results by provider</h2>
      <Accordion.Root type="multiple" value={search ? providers : target ? [target.provider] : []}>
        {#each providers as provider (provider)}<Accordion.Item value={provider}
            ><Accordion.Trigger
              ><span class="text-base"
                >{provider}
                <Badge variant="secondary">{shown.filter((m) => m.provider === provider).length} models</Badge></span
              ></Accordion.Trigger
            ><Accordion.Content>
              <Accordion.Root
                type="multiple"
                value={search
                  ? shown.filter((m) => m.provider === provider).map((m) => m.key)
                  : target?.provider === provider
                    ? [target.key]
                    : []}
              >
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
                      <Table.Root
                        ><Table.Header
                          ><Table.Row
                            ><Table.Head>Test</Table.Head><Table.Head>Correct</Table.Head><Table.Head>pass@1</Table.Head
                            ><Table.Head>pass@10</Table.Head><Table.Head>Samples</Table.Head></Table.Row
                          ></Table.Header
                        ><Table.Body
                          >{#each model.tests as result (result)}<Table.Row
                              ><Table.Cell class="font-medium">{result.testName}</Table.Cell><Table.Cell
                                >{result.numCorrect}/{result.numSamples}</Table.Cell
                              ><Table.Cell>{(result.pass1 * 100).toFixed(1)}%</Table.Cell><Table.Cell
                                >{(result.pass10 * 100).toFixed(1)}%</Table.Cell
                              ><Table.Cell><Samples {result} /></Table.Cell></Table.Row
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
  <Tabs.Root value={tab} onValueChange={(value) => update("tab", value)}>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-4">
      <Tabs.List
        ><Tabs.Trigger value="all">All models <span class="ml-1 text-xs">{all.length}</span></Tabs.Trigger><Tabs.Trigger
          value="local"
          >Local models <span class="ml-1 text-xs"
            >{all.filter((m) => m.provider.toLowerCase() === "ollama").length}</span
          ></Tabs.Trigger
        ></Tabs.List
      >
      <div class="flex w-full items-center gap-2 sm:w-80">
        <Input
          aria-label="Search models and providers"
          placeholder="Search models or providers…"
          value={search}
          oninput={(event) => update("search", event.currentTarget.value)}
        />{#if search}<Button variant="ghost" onclick={() => update("search", "")}>Clear</Button>{/if}
      </div>
    </div>
    <Tabs.Content value="all"
      >{#if tab === "all"}{@render resultsPanel()}{/if}</Tabs.Content
    >
    <Tabs.Content value="local"
      >{#if tab === "local"}{@render resultsPanel()}{/if}</Tabs.Content
    >
  </Tabs.Root>
{/if}
