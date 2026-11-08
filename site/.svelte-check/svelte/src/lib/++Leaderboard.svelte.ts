///<reference types="svelte" />
import type { Model } from "#lib/results.js";
import { formatDuration, formatTps, responseTitle } from "#lib/results.js";
import * as Table from "#lib/components/ui/table/index.js";
import * as Tooltip from "#lib/components/ui/tooltip/index.js";
import { Button } from "#lib/components/ui/button/index.js";
import { Progress } from "#lib/components/ui/progress/index.js";

type $$ComponentProps = {
  models: Model[];
  local: boolean;
  sort: string;
  onsort: (key: string) => void;
  maxTps: number;
  showTps: boolean;
  showTime: boolean;
};
function $$render() {
  let { models, local, sort, onsort, maxTps, showTps, showTime }: /*Ωignore_startΩ*/ $$ComponentProps /*Ωignore_endΩ*/ =
    $props();
  const ariaSort = (key: string): "ascending" | "descending" | "none" =>
    sort.startsWith(key) ? (sort.endsWith("asc") || sort === "time" ? "ascending" : "descending") : "none";
  async () => {
    {
      svelteHTML.createElement("div", { class: `overflow-hidden rounded-xl border` });
      {
        const $$_tooR_elbaT1C = __sveltets_2_ensureComponent(Table.Root);
        new $$_tooR_elbaT1C({
          target: __sveltets_2_any(),
          props: {
            children: () => {
              return __sveltets_2_any(0);
            },
          },
        });
        {
          const $$_redaeH_elbaT2C = __sveltets_2_ensureComponent(Table.Header);
          new $$_redaeH_elbaT2C({
            target: __sveltets_2_any(),
            props: {
              children: () => {
                return __sveltets_2_any(0);
              },
            },
          });
          {
            const $$_woR_elbaT3C = __sveltets_2_ensureComponent(Table.Row);
            new $$_woR_elbaT3C({
              target: __sveltets_2_any(),
              props: {
                children: () => {
                  return __sveltets_2_any(0);
                },
              },
            });
            {
              const $$_daeH_elbaT4C = __sveltets_2_ensureComponent(Table.Head);
              new $$_daeH_elbaT4C({
                target: __sveltets_2_any(),
                props: {
                  children: () => {
                    return __sveltets_2_any(0);
                  },
                  class: `w-14`,
                },
              });
              Table.Head;
            }
            {
              const $$_daeH_elbaT4C = __sveltets_2_ensureComponent(Table.Head);
              new $$_daeH_elbaT4C({
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
              const $$_daeH_elbaT4C = __sveltets_2_ensureComponent(Table.Head);
              new $$_daeH_elbaT4C({
                target: __sveltets_2_any(),
                props: {
                  children: () => {
                    return __sveltets_2_any(0);
                  },
                  class: `w-40`,
                },
              });
              {
                const $$_nottuB5C = __sveltets_2_ensureComponent(Button);
                new $$_nottuB5C({
                  target: __sveltets_2_any(),
                  props: {
                    children: () => {
                      return __sveltets_2_any(0);
                    },
                    variant: `ghost`,
                    size: `sm`,
                    disabled: !local,
                    onclick: () => onsort("score"),
                  },
                });
                Button;
              }
              Table.Head;
            }
            if (showTps) {
              {
                const $$_daeH_elbaT4C = __sveltets_2_ensureComponent(Table.Head);
                new $$_daeH_elbaT4C({
                  target: __sveltets_2_any(),
                  props: {
                    children: () => {
                      return __sveltets_2_any(0);
                    },
                    "aria-sort": ariaSort("tps"),
                  },
                });
                {
                  const $$_nottuB5C = __sveltets_2_ensureComponent(Button);
                  new $$_nottuB5C({
                    target: __sveltets_2_any(),
                    props: {
                      children: () => {
                        return __sveltets_2_any(0);
                      },
                      variant: `ghost`,
                      size: `sm`,
                      disabled: !local,
                      onclick: () => onsort("tps"),
                    },
                  });
                  sort.startsWith("tps") ? (sort.endsWith("asc") ? "↑" : "↓") : "";
                  Button;
                }
                Table.Head;
              }
            }
            if (showTime) {
              {
                const $$_daeH_elbaT4C = __sveltets_2_ensureComponent(Table.Head);
                new $$_daeH_elbaT4C({
                  target: __sveltets_2_any(),
                  props: {
                    children: () => {
                      return __sveltets_2_any(0);
                    },
                    "aria-sort": ariaSort("time"),
                  },
                });
                {
                  const $$_nottuB5C = __sveltets_2_ensureComponent(Button);
                  new $$_nottuB5C({
                    target: __sveltets_2_any(),
                    props: {
                      children: () => {
                        return __sveltets_2_any(0);
                      },
                      variant: `ghost`,
                      size: `sm`,
                      disabled: !local,
                      onclick: () => onsort("time"),
                    },
                  });
                  sort.startsWith("time") ? (sort.endsWith("desc") ? "↓" : "↑") : "";
                  Button;
                }
                Table.Head;
              }
            }
            Table.Row;
          }
          Table.Header;
        }
        {
          const $$_ydoB_elbaT2C = __sveltets_2_ensureComponent(Table.Body);
          new $$_ydoB_elbaT2C({
            target: __sveltets_2_any(),
            props: {
              children: () => {
                return __sveltets_2_any(0);
              },
            },
          });
          for (let model of __sveltets_2_ensureArray(models)) {
            model.key;
            {
              const $$_woR_elbaT3C = __sveltets_2_ensureComponent(Table.Row);
              new $$_woR_elbaT3C({
                target: __sveltets_2_any(),
                props: {
                  children: () => {
                    return __sveltets_2_any(0);
                  },
                },
              });
              {
                const $$_lleC_elbaT4C = __sveltets_2_ensureComponent(Table.Cell);
                new $$_lleC_elbaT4C({
                  target: __sveltets_2_any(),
                  props: {
                    children: () => {
                      return __sveltets_2_any(0);
                    },
                    class: `font-mono text-muted-foreground`,
                  },
                });
                model.rank;
                Table.Cell;
              }
              {
                const $$_lleC_elbaT4C = __sveltets_2_ensureComponent(Table.Cell);
                new $$_lleC_elbaT4C({
                  target: __sveltets_2_any(),
                  props: {
                    children: () => {
                      return __sveltets_2_any(0);
                    },
                    class: `max-w-52 whitespace-normal sm:max-w-96`,
                  },
                });
                if (model.modelUrl) {
                  {
                    svelteHTML.createElement("a", {
                      class: `break-words font-medium underline-offset-4 hover:underline`,
                      href: model.modelUrl,
                      target: `_blank`,
                      rel: `noreferrer`,
                    });
                    model.model;
                  }
                } else {
                  {
                    svelteHTML.createElement("span", { class: `break-words font-medium` });
                    model.model;
                  }
                }
                {
                  svelteHTML.createElement("div", { class: `mt-1 text-xs text-muted-foreground` });
                  model.provider;
                }
                Table.Cell;
              }
              {
                const $$_lleC_elbaT4C = __sveltets_2_ensureComponent(Table.Cell);
                new $$_lleC_elbaT4C({
                  target: __sveltets_2_any(),
                  props: {
                    children: () => {
                      return __sveltets_2_any(0);
                    },
                  },
                });
                {
                  svelteHTML.createElement("div", { class: `mb-2 font-mono font-semibold` });
                  model.score.toFixed(1);
                }
                {
                  const $$_ssergorP5C = __sveltets_2_ensureComponent(Progress);
                  new $$_ssergorP5C({
                    target: __sveltets_2_any(),
                    props: { value: model.score, "aria-label": `${model.model} pass@1`, class: `max-w-28` },
                  });
                }
                Table.Cell;
              }
              if (showTps) {
                {
                  const $$_lleC_elbaT4C = __sveltets_2_ensureComponent(Table.Cell);
                  new $$_lleC_elbaT4C({
                    target: __sveltets_2_any(),
                    props: {
                      children: () => {
                        return __sveltets_2_any(0);
                      },
                    },
                  });
                  {
                    svelteHTML.createElement("div", { class: `font-mono` });
                    model.tps === null ? "—" : `${formatTps(model.tps)} tok/s`;
                  }
                  if (model.tps) {
                    {
                      const $$_ssergorP5C = __sveltets_2_ensureComponent(Progress);
                      new $$_ssergorP5C({
                        target: __sveltets_2_any(),
                        props: {
                          value: Math.max(2, Math.round((model.tps / maxTps) * 100)),
                          "aria-label": `${model.model} relative generation speed`,
                          class: `mt-2 max-w-24 [&_[data-slot=progress-indicator]]:bg-muted-foreground`,
                        },
                      });
                    }
                  }
                  Table.Cell;
                }
              }
              if (showTime) {
                {
                  const $$_lleC_elbaT4C = __sveltets_2_ensureComponent(Table.Cell);
                  new $$_lleC_elbaT4C({
                    target: __sveltets_2_any(),
                    props: {
                      children: () => {
                        return __sveltets_2_any(0);
                      },
                    },
                  });
                  if (model.tokenTimes) {
                    {
                      const $$_tooR_pitlooT5C = __sveltets_2_ensureComponent(Tooltip.Root);
                      new $$_tooR_pitlooT5C({
                        target: __sveltets_2_any(),
                        props: {
                          children: () => {
                            return __sveltets_2_any(0);
                          },
                        },
                      });
                      {
                        const $$_reggirT_pitlooT6C = __sveltets_2_ensureComponent(Tooltip.Trigger);
                        new $$_reggirT_pitlooT6C({
                          target: __sveltets_2_any(),
                          props: {
                            children: () => {
                              return __sveltets_2_any(0);
                            },
                            class: `text-left font-mono underline decoration-dotted underline-offset-4`,
                          },
                        });
                        model.tokenTimes.avgResponseSeconds == null
                          ? `${Math.round(model.tokenTimes.avgOutputTokens).toLocaleString("en-US")} tok`
                          : `~${formatDuration(model.tokenTimes.avgResponseSeconds)}*`;
                        Tooltip.Trigger;
                      }
                      {
                        const $$_tnetnoC_pitlooT6C = __sveltets_2_ensureComponent(Tooltip.Content);
                        new $$_tnetnoC_pitlooT6C({
                          target: __sveltets_2_any(),
                          props: {
                            children: () => {
                              return __sveltets_2_any(0);
                            },
                            class: `max-w-80`,
                          },
                        });
                        responseTitle(model);
                        Tooltip.Content;
                      }
                      Tooltip.Root;
                    }
                  } else {
                  }
                  Table.Cell;
                }
              }
              Table.Row;
            }
          }
          Table.Body;
        }
        Table.Root;
      }
    }
  };
  return {
    props: {} as any as $$ComponentProps,
    exports: {},
    bindings: __sveltets_$$bindings(""),
    slots: {},
    events: {},
  };
}
const Leaderboard__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type Leaderboard__SvelteComponent_ = ReturnType<typeof Leaderboard__SvelteComponent_>;
/*Ωignore_endΩ*/ export default Leaderboard__SvelteComponent_;
