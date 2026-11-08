///<reference types="svelte" />
import { onMount } from "svelte";
import { page } from "$app/state";
import { goto } from "$app/navigation";
import { resolve, asset } from "$app/paths";
import type { PageProps } from "./$types.js";
import { models, visibleModels, formatTps, formatDuration } from "#lib/results.js";
import * as Tabs from "#lib/components/ui/tabs/index.js";
import * as Accordion from "#lib/components/ui/accordion/index.js";
import * as Table from "#lib/components/ui/table/index.js";
import { Input } from "#lib/components/ui/input/index.js";
import { Button } from "#lib/components/ui/button/index.js";
import { Badge } from "#lib/components/ui/badge/index.js";
import Leaderboard from "#lib/Leaderboard.svelte";
import Samples from "#lib/Samples.svelte";
function $$render() {
  let { data }: PageProps = $props();
  let ready = $state(false);
  onMount(() => {
    ready = true;
  });
  const search = $derived(ready ? (page.url.searchParams.get("search") ?? "") : "");
  const tab = $derived(ready && page.url.searchParams.get("tab") === "local" ? "local" : "all");
  const sort = $derived(ready ? (page.url.searchParams.get("sort") ?? "score") : "score");
  const all = $derived(models(data.results));
  const shown = $derived(visibleModels(all, search, tab, sort));
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
    const url = new URL(page.url.href);
    if (value && !(key === "tab" && value === "all") && !(key === "sort" && value === "score"))
      url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    void goto(url, { shallow: true, replace: true, reset: false });
  }
  function sortBy(key: string) {
    if (key === "score") return update("sort", "score");
    const first = key === "time" ? "asc" : "desc";
    const current = sort.split("-");
    const direction = current[0] === key ? ((current[1] ?? first) === "asc" ? "desc" : "asc") : first;
    update("sort", direction === first ? key : `${key}-${direction}`);
  }
  async () => {
    {
      svelteHTML.createElement("svelte:head", {});
      {
        svelteHTML.createElement("title", {});
        data.legacy ? "Legacy v1 · " : "";
        data.selected ? (merged ? "Leaderboard" : "Benchmark run") : "Results";
      }
    }
    if (data.legacy) {
      {
        svelteHTML.createElement("aside", {
          role: `note`,
          class: `mb-8 rounded-lg border border-amber-600/40 bg-amber-500/10 p-4 text-sm`,
        });
        {
          svelteHTML.createElement("strong", {});
        }
        {
          svelteHTML.createElement("p", { class: `mt-1` });
        }
      }
    }
    {
      svelteHTML.createElement("div", { class: `mb-8 flex flex-wrap items-end justify-between gap-4` });
      {
        svelteHTML.createElement("div", {});
        {
          svelteHTML.createElement("p", { class: `mb-3 text-sm font-medium text-muted-foreground` });
        }
        {
          svelteHTML.createElement("h1", { class: `text-3xl font-semibold tracking-tight sm:text-4xl` });
          data.selected ? (merged ? "Model leaderboard" : "Benchmark run") : "Benchmark results";
        }
        {
          svelteHTML.createElement("p", { class: `mt-3 max-w-2xl break-all text-sm text-muted-foreground` });
          data.selected ?? "Explore the latest results and every individual benchmark run.";
        }
      }
      if (data.selected) {
        {
          const $$_nottuB1C = __sveltets_2_ensureComponent(Button);
          new $$_nottuB1C({
            target: __sveltets_2_any(),
            props: {
              children: () => {
                return __sveltets_2_any(0);
              },
              variant: `outline`,
              href: download(data.selected),
              download: true,
            },
          });
          Button;
        }
      }
    }
    if (!data.selected) {
      if (mergedFile) {
        {
          svelteHTML.createElement("section", { class: `mb-8 rounded-xl border bg-card p-6 sm:p-8` });
          {
            const $$_egdaB1C = __sveltets_2_ensureComponent(Badge);
            new $$_egdaB1C({
              target: __sveltets_2_any(),
              props: {
                children: () => {
                  return __sveltets_2_any(0);
                },
                variant: `secondary`,
              },
            });
            Badge;
          }
          {
            svelteHTML.createElement("h2", { class: `mt-4 text-2xl font-semibold tracking-tight` });
          }
          {
            svelteHTML.createElement("p", { class: `my-4 text-muted-foreground` });
          }
          {
            svelteHTML.createElement("div", { class: `flex flex-wrap gap-3` });
            {
              const $$_nottuB2C = __sveltets_2_ensureComponent(Button);
              new $$_nottuB2C({
                target: __sveltets_2_any(),
                props: {
                  children: () => {
                    return __sveltets_2_any(0);
                  },
                  href: link(mergedFile),
                },
              });
              Button;
            }
            {
              const $$_nottuB2C = __sveltets_2_ensureComponent(Button);
              new $$_nottuB2C({
                target: __sveltets_2_any(),
                props: {
                  children: () => {
                    return __sveltets_2_any(0);
                  },
                  variant: `outline`,
                  href: download(mergedFile),
                  download: true,
                },
              });
              Button;
            }
          }
        }
      }
      {
        const $$_tooR_noidroccA0C = __sveltets_2_ensureComponent(Accordion.Root);
        new $$_tooR_noidroccA0C({
          target: __sveltets_2_any(),
          props: {
            children: () => {
              return __sveltets_2_any(0);
            },
            type: `single`,
          },
        });
        {
          const $$_metI_noidroccA1C = __sveltets_2_ensureComponent(Accordion.Item);
          new $$_metI_noidroccA1C({
            target: __sveltets_2_any(),
            props: {
              children: () => {
                return __sveltets_2_any(0);
              },
              value: `runs`,
            },
          });
          {
            const $$_reggirT_noidroccA2C = __sveltets_2_ensureComponent(Accordion.Trigger);
            new $$_reggirT_noidroccA2C({
              target: __sveltets_2_any(),
              props: {
                children: () => {
                  return __sveltets_2_any(0);
                },
              },
            });
            {
              svelteHTML.createElement("span", { class: `text-lg` });
              {
                const $$_egdaB4C = __sveltets_2_ensureComponent(Badge);
                new $$_egdaB4C({
                  target: __sveltets_2_any(),
                  props: {
                    children: () => {
                      return __sveltets_2_any(0);
                    },
                    variant: `secondary`,
                  },
                });
                data.files.filter((n) => !n.includes("merged")).length;
                Badge;
              }
            }
            Accordion.Trigger;
          }
          {
            const $$_tnetnoC_noidroccA2C = __sveltets_2_ensureComponent(Accordion.Content);
            new $$_tnetnoC_noidroccA2C({
              target: __sveltets_2_any(),
              props: {
                children: () => {
                  return __sveltets_2_any(0);
                },
              },
            });
            {
              svelteHTML.createElement("ul", { class: `divide-y` });
              for (let name of __sveltets_2_ensureArray(data.files.filter((n) => !n.includes("merged")))) {
                {
                  svelteHTML.createElement("li", { class: `flex flex-wrap items-center justify-between gap-3 py-4` });
                  {
                    svelteHTML.createElement("a", {
                      class: `min-w-0 break-all text-sm hover:underline`,
                      href: link(name),
                    });
                    name.replace(".json", "");
                  }
                  {
                    const $$_nottuB5C = __sveltets_2_ensureComponent(Button);
                    new $$_nottuB5C({
                      target: __sveltets_2_any(),
                      props: {
                        children: () => {
                          return __sveltets_2_any(0);
                        },
                        size: `sm`,
                        variant: `outline`,
                        href: download(name),
                        download: true,
                      },
                    });
                    Button;
                  }
                }
              }
            }
            Accordion.Content;
          }
          Accordion.Item;
        }
        Accordion.Root;
      }
      if (!data.files.length) {
        {
          svelteHTML.createElement("p", {});
        }
      }
    } else {
      for (let context of __sveltets_2_ensureArray(contexts)) {
        {
          const $$_tooR_noidroccA0C = __sveltets_2_ensureComponent(Accordion.Root);
          new $$_tooR_noidroccA0C({
            target: __sveltets_2_any(),
            props: {
              children: () => {
                return __sveltets_2_any(0);
              },
              type: `single`,
              class: `mb-6 rounded-lg border px-4`,
            },
          });
          {
            const $$_metI_noidroccA1C = __sveltets_2_ensureComponent(Accordion.Item);
            new $$_metI_noidroccA1C({
              target: __sveltets_2_any(),
              props: {
                children: () => {
                  return __sveltets_2_any(0);
                },
                value: `context`,
                class: `border-0`,
              },
            });
            {
              const $$_reggirT_noidroccA2C = __sveltets_2_ensureComponent(Accordion.Trigger);
              new $$_reggirT_noidroccA2C({
                target: __sveltets_2_any(),
                props: {
                  children: () => {
                    return __sveltets_2_any(0);
                  },
                },
              });
              context.filename ?? "Additional context";
              Accordion.Trigger;
            }
            {
              const $$_tnetnoC_noidroccA2C = __sveltets_2_ensureComponent(Accordion.Content);
              new $$_tnetnoC_noidroccA2C({
                target: __sveltets_2_any(),
                props: {
                  children: () => {
                    return __sveltets_2_any(0);
                  },
                },
              });
              {
                svelteHTML.createElement("pre", { class: `max-h-96 overflow-y-auto text-xs` });
                context.content ?? "";
              }
              Accordion.Content;
            }
            Accordion.Item;
          }
          Accordion.Root;
        }
      }
      {
        svelteHTML.createElement("div", { class: `mb-5 flex flex-wrap items-center justify-between gap-4` });
        {
          const $$_tooR_sbaT1C = __sveltets_2_ensureComponent(Tabs.Root);
          new $$_tooR_sbaT1C({
            target: __sveltets_2_any(),
            props: {
              children: () => {
                return __sveltets_2_any(0);
              },
              value: tab,
              onValueChange: (value) => update("tab", value),
            },
          });
          {
            const $$_tsiL_sbaT2C = __sveltets_2_ensureComponent(Tabs.List);
            new $$_tsiL_sbaT2C({
              target: __sveltets_2_any(),
              props: {
                children: () => {
                  return __sveltets_2_any(0);
                },
              },
            });
            {
              const $$_reggirT_sbaT3C = __sveltets_2_ensureComponent(Tabs.Trigger);
              new $$_reggirT_sbaT3C({
                target: __sveltets_2_any(),
                props: {
                  children: () => {
                    return __sveltets_2_any(0);
                  },
                  value: `all`,
                },
              });
              {
                svelteHTML.createElement("span", { class: `ml-1 text-xs` });
                all.length;
              }
              Tabs.Trigger;
            }
            {
              const $$_reggirT_sbaT3C = __sveltets_2_ensureComponent(Tabs.Trigger);
              new $$_reggirT_sbaT3C({
                target: __sveltets_2_any(),
                props: {
                  children: () => {
                    return __sveltets_2_any(0);
                  },
                  value: `local`,
                },
              });
              {
                svelteHTML.createElement("span", { class: `ml-1 text-xs` });
                all.filter((m) => m.provider.toLowerCase() === "ollama").length;
              }
              Tabs.Trigger;
            }
            Tabs.List;
          }
          Tabs.Root;
        }
        {
          svelteHTML.createElement("div", { class: `flex w-full items-center gap-2 sm:w-80` });
          {
            const $$_tupnI2C = __sveltets_2_ensureComponent(Input);
            new $$_tupnI2C({
              target: __sveltets_2_any(),
              props: {
                "aria-label": `Search models and providers`,
                placeholder: `Search models or providers…`,
                value: search,
                oninput: (event) => update("search", event.currentTarget.value),
              },
            });
          }
          if (search) {
            {
              const $$_nottuB2C = __sveltets_2_ensureComponent(Button);
              new $$_nottuB2C({
                target: __sveltets_2_any(),
                props: {
                  children: () => {
                    return __sveltets_2_any(0);
                  },
                  variant: `ghost`,
                  onclick: () => update("search", ""),
                },
              });
              Button;
            }
          }
        }
      }
      {
        svelteHTML.createElement("p", { "aria-live": `polite`, class: `mb-4 text-sm text-muted-foreground` });
        shown.length;
        merged ? " · Average pass@1 scores" : "";
      }
      if (merged) {
        {
          const $$_draobredaeL0C = __sveltets_2_ensureComponent(Leaderboard);
          new $$_draobredaeL0C({
            target: __sveltets_2_any(),
            props: {
              models: shown,
              local: tab === "local",
              sort,
              onsort: sortBy,
              maxTps: Math.max(0, ...all.map((m) => m.tps ?? 0)),
              showTps: all.some((m) => m.tps !== null),
              showTime: all.some((m) => m.tokenTimes !== null),
            },
          });
        }
      }
      if (!shown.length) {
        {
          svelteHTML.createElement("p", { class: `rounded-lg border p-8 text-center text-muted-foreground` });
        }
      }
      if (all.some((m) => m.tps || m.tokenTimes)) {
        {
          svelteHTML.createElement("p", { class: `mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground` });
        }
      }
      {
        svelteHTML.createElement("section", { class: `mt-12` });
        {
          svelteHTML.createElement("h2", { class: `mb-4 text-xl font-semibold tracking-tight` });
        }
        {
          const $$_tooR_noidroccA1C = __sveltets_2_ensureComponent(Accordion.Root);
          new $$_tooR_noidroccA1C({
            target: __sveltets_2_any(),
            props: {
              children: () => {
                return __sveltets_2_any(0);
              },
              type: `multiple`,
              value: search ? providers : [],
            },
          });
          for (let provider of __sveltets_2_ensureArray(providers)) {
            {
              const $$_metI_noidroccA2C = __sveltets_2_ensureComponent(Accordion.Item);
              new $$_metI_noidroccA2C({
                target: __sveltets_2_any(),
                props: {
                  children: () => {
                    return __sveltets_2_any(0);
                  },
                  value: provider,
                },
              });
              {
                const $$_reggirT_noidroccA3C = __sveltets_2_ensureComponent(Accordion.Trigger);
                new $$_reggirT_noidroccA3C({
                  target: __sveltets_2_any(),
                  props: {
                    children: () => {
                      return __sveltets_2_any(0);
                    },
                  },
                });
                {
                  svelteHTML.createElement("span", { class: `text-base` });
                  provider;
                  {
                    const $$_egdaB5C = __sveltets_2_ensureComponent(Badge);
                    new $$_egdaB5C({
                      target: __sveltets_2_any(),
                      props: {
                        children: () => {
                          return __sveltets_2_any(0);
                        },
                        variant: `secondary`,
                      },
                    });
                    shown.filter((m) => m.provider === provider).length;
                    Badge;
                  }
                }
                Accordion.Trigger;
              }
              {
                const $$_tnetnoC_noidroccA3C = __sveltets_2_ensureComponent(Accordion.Content);
                new $$_tnetnoC_noidroccA3C({
                  target: __sveltets_2_any(),
                  props: {
                    children: () => {
                      return __sveltets_2_any(0);
                    },
                  },
                });
                {
                  const $$_tooR_noidroccA4C = __sveltets_2_ensureComponent(Accordion.Root);
                  new $$_tooR_noidroccA4C({
                    target: __sveltets_2_any(),
                    props: {
                      children: () => {
                        return __sveltets_2_any(0);
                      },
                      type: `multiple`,
                      value: search ? shown.filter((m) => m.provider === provider).map((m) => m.key) : [],
                    },
                  });
                  for (let model of __sveltets_2_ensureArray(
                    shown.filter((m) => m.provider === provider).sort((a, b) => a.model.localeCompare(b.model)),
                  )) {
                    model.key;
                    {
                      const $$_metI_noidroccA5C = __sveltets_2_ensureComponent(Accordion.Item);
                      new $$_metI_noidroccA5C({
                        target: __sveltets_2_any(),
                        props: {
                          children: () => {
                            return __sveltets_2_any(0);
                          },
                          value: model.key,
                        },
                      });
                      {
                        const $$_reggirT_noidroccA6C = __sveltets_2_ensureComponent(Accordion.Trigger);
                        new $$_reggirT_noidroccA6C({
                          target: __sveltets_2_any(),
                          props: {
                            children: () => {
                              return __sveltets_2_any(0);
                            },
                          },
                        });
                        {
                          svelteHTML.createElement("span", { class: `min-w-0 break-all pr-3` });
                          model.model;
                          {
                            svelteHTML.createElement("span", { class: `ml-2 font-mono text-muted-foreground` });
                            model.score.toFixed(1);
                          }
                        }
                        Accordion.Trigger;
                      }
                      {
                        const $$_tnetnoC_noidroccA6C = __sveltets_2_ensureComponent(Accordion.Content);
                        new $$_tnetnoC_noidroccA6C({
                          target: __sveltets_2_any(),
                          props: {
                            children: () => {
                              return __sveltets_2_any(0);
                            },
                          },
                        });
                        {
                          svelteHTML.createElement("div", {
                            class: `mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground`,
                          });
                          if (model.modelUrl) {
                            {
                              svelteHTML.createElement("a", {
                                href: model.modelUrl,
                                class: `underline`,
                                target: `_blank`,
                                rel: `noreferrer`,
                              });
                            }
                          }
                          if (model.tps) {
                            {
                              svelteHTML.createElement("span", {});
                              formatTps(model.tps);
                            }
                          }
                          if (model.tokenTimes?.avgResponseSeconds != null) {
                            {
                              svelteHTML.createElement("span", {});
                              formatDuration(model.tokenTimes.avgResponseSeconds);
                            }
                          }
                        }
                        {
                          const $$_tooR_elbaT7C = __sveltets_2_ensureComponent(Table.Root);
                          new $$_tooR_elbaT7C({
                            target: __sveltets_2_any(),
                            props: {
                              children: () => {
                                return __sveltets_2_any(0);
                              },
                            },
                          });
                          {
                            const $$_redaeH_elbaT8C = __sveltets_2_ensureComponent(Table.Header);
                            new $$_redaeH_elbaT8C({
                              target: __sveltets_2_any(),
                              props: {
                                children: () => {
                                  return __sveltets_2_any(0);
                                },
                              },
                            });
                            {
                              const $$_woR_elbaT9C = __sveltets_2_ensureComponent(Table.Row);
                              new $$_woR_elbaT9C({
                                target: __sveltets_2_any(),
                                props: {
                                  children: () => {
                                    return __sveltets_2_any(0);
                                  },
                                },
                              });
                              {
                                const $$_daeH_elbaT10C = __sveltets_2_ensureComponent(Table.Head);
                                new $$_daeH_elbaT10C({
                                  target: __sveltets_2_any(),
                                  props: {
                                    children: () => {
                                      return __sveltets_2_any(0);
                                    },
                                  },
                                });
                                Table.Head;
                              }
                              {
                                const $$_daeH_elbaT10C = __sveltets_2_ensureComponent(Table.Head);
                                new $$_daeH_elbaT10C({
                                  target: __sveltets_2_any(),
                                  props: {
                                    children: () => {
                                      return __sveltets_2_any(0);
                                    },
                                  },
                                });
                                Table.Head;
                              }
                              {
                                const $$_daeH_elbaT10C = __sveltets_2_ensureComponent(Table.Head);
                                new $$_daeH_elbaT10C({
                                  target: __sveltets_2_any(),
                                  props: {
                                    children: () => {
                                      return __sveltets_2_any(0);
                                    },
                                  },
                                });
                                Table.Head;
                              }
                              {
                                const $$_daeH_elbaT10C = __sveltets_2_ensureComponent(Table.Head);
                                new $$_daeH_elbaT10C({
                                  target: __sveltets_2_any(),
                                  props: {
                                    children: () => {
                                      return __sveltets_2_any(0);
                                    },
                                  },
                                });
                                Table.Head;
                              }
                              {
                                const $$_daeH_elbaT10C = __sveltets_2_ensureComponent(Table.Head);
                                new $$_daeH_elbaT10C({
                                  target: __sveltets_2_any(),
                                  props: {
                                    children: () => {
                                      return __sveltets_2_any(0);
                                    },
                                  },
                                });
                                Table.Head;
                              }
                              Table.Row;
                            }
                            Table.Header;
                          }
                          {
                            const $$_ydoB_elbaT8C = __sveltets_2_ensureComponent(Table.Body);
                            new $$_ydoB_elbaT8C({
                              target: __sveltets_2_any(),
                              props: {
                                children: () => {
                                  return __sveltets_2_any(0);
                                },
                              },
                            });
                            for (let result of __sveltets_2_ensureArray(model.tests)) {
                              {
                                const $$_woR_elbaT9C = __sveltets_2_ensureComponent(Table.Row);
                                new $$_woR_elbaT9C({
                                  target: __sveltets_2_any(),
                                  props: {
                                    children: () => {
                                      return __sveltets_2_any(0);
                                    },
                                  },
                                });
                                {
                                  const $$_lleC_elbaT10C = __sveltets_2_ensureComponent(Table.Cell);
                                  new $$_lleC_elbaT10C({
                                    target: __sveltets_2_any(),
                                    props: {
                                      children: () => {
                                        return __sveltets_2_any(0);
                                      },
                                      class: `font-medium`,
                                    },
                                  });
                                  result.testName;
                                  Table.Cell;
                                }
                                {
                                  const $$_lleC_elbaT10C = __sveltets_2_ensureComponent(Table.Cell);
                                  new $$_lleC_elbaT10C({
                                    target: __sveltets_2_any(),
                                    props: {
                                      children: () => {
                                        return __sveltets_2_any(0);
                                      },
                                    },
                                  });
                                  result.numCorrect;
                                  result.numSamples;
                                  Table.Cell;
                                }
                                {
                                  const $$_lleC_elbaT10C = __sveltets_2_ensureComponent(Table.Cell);
                                  new $$_lleC_elbaT10C({
                                    target: __sveltets_2_any(),
                                    props: {
                                      children: () => {
                                        return __sveltets_2_any(0);
                                      },
                                    },
                                  });
                                  (result.pass1 * 100).toFixed(1);
                                  Table.Cell;
                                }
                                {
                                  const $$_lleC_elbaT10C = __sveltets_2_ensureComponent(Table.Cell);
                                  new $$_lleC_elbaT10C({
                                    target: __sveltets_2_any(),
                                    props: {
                                      children: () => {
                                        return __sveltets_2_any(0);
                                      },
                                    },
                                  });
                                  (result.pass10 * 100).toFixed(1);
                                  Table.Cell;
                                }
                                {
                                  const $$_lleC_elbaT10C = __sveltets_2_ensureComponent(Table.Cell);
                                  new $$_lleC_elbaT10C({
                                    target: __sveltets_2_any(),
                                    props: {
                                      children: () => {
                                        return __sveltets_2_any(0);
                                      },
                                    },
                                  });
                                  {
                                    const $$_selpmaS11C = __sveltets_2_ensureComponent(Samples);
                                    new $$_selpmaS11C({ target: __sveltets_2_any(), props: { result } });
                                  }
                                  Table.Cell;
                                }
                                Table.Row;
                              }
                            }
                            Table.Body;
                          }
                          Table.Root;
                        }
                        Accordion.Content;
                      }
                      Accordion.Item;
                    }
                  }
                  Accordion.Root;
                }
                Accordion.Content;
              }
              Accordion.Item;
            }
          }
          Accordion.Root;
        }
      }
    }
  };
  return { props: {} as any as PageProps, exports: {}, bindings: __sveltets_$$bindings(""), slots: {}, events: {} };
}
const Page__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type Page__SvelteComponent_ = ReturnType<typeof Page__SvelteComponent_>;
/*Ωignore_endΩ*/ export default Page__SvelteComponent_;
