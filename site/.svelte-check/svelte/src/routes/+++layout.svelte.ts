///<reference types="svelte" />
import "../app.css";
import type { Snippet } from "svelte";
import { onMount } from "svelte";
import { resolve } from "$app/paths";
import { Button } from "#lib/components/ui/button/index.js";
import * as Tooltip from "#lib/components/ui/tooltip/index.js";
import { Moon, Sun } from "@lucide/svelte";

type $$ComponentProps = { children: Snippet };
function $$render() {
  let { children }: /*Ωignore_startΩ*/ $$ComponentProps /*Ωignore_endΩ*/ = $props();
  let dark = $state(false);
  onMount(() => {
    dark = document.documentElement.classList.contains("dark");
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      if (!localStorage.getItem("themeIsManual")) {
        dark = media.matches;
        document.documentElement.classList.toggle("dark", dark);
      }
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  });
  function toggleTheme() {
    dark = !dark;
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
      localStorage.setItem("themeIsManual", "true");
    } catch {}
  }
  async () => {
    {
      svelteHTML.createElement("svelte:head", {});
      {
        svelteHTML.createElement("title", {});
      }
      {
        svelteHTML.createElement("meta", {
          name: `description`,
          content: `Compare language models on real Svelte 5 component tests using HumanEval pass@k metrics.`,
        });
      }
    }
    {
      const $$_redivorP_pitlooT0C = __sveltets_2_ensureComponent(Tooltip.Provider);
      new $$_redivorP_pitlooT0C({
        target: __sveltets_2_any(),
        props: {
          children: () => {
            return __sveltets_2_any(0);
          },
        },
      });
      {
        svelteHTML.createElement("a", { href: `#main`, class: `sr-only focus:not-sr-only` });
      }
      {
        svelteHTML.createElement("header", { class: `border-b` });
        {
          svelteHTML.createElement("nav", {
            "aria-label": `Main`,
            class: `mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-4 sm:px-8`,
          });
          {
            svelteHTML.createElement("a", {
              class: `mr-auto text-xl font-semibold tracking-tight`,
              href: resolve("/[...path]", { path: "" }),
            });
            {
              svelteHTML.createElement("span", { class: `text-primary` });
            }
          }
          {
            const $$_nottuB3C = __sveltets_2_ensureComponent(Button);
            new $$_nottuB3C({
              target: __sveltets_2_any(),
              props: {
                children: () => {
                  return __sveltets_2_any(0);
                },
                variant: `ghost`,
                href: resolve("/[...path]", { path: "benchmark-results-merged.html" }),
              },
            });
            Button;
          }
          {
            const $$_nottuB3C = __sveltets_2_ensureComponent(Button);
            new $$_nottuB3C({
              target: __sveltets_2_any(),
              props: {
                children: () => {
                  return __sveltets_2_any(0);
                },
                variant: `ghost`,
                href: resolve("/[...path]", { path: "index.html" }),
              },
            });
            Button;
          }
          {
            const $$_nottuB3C = __sveltets_2_ensureComponent(Button);
            new $$_nottuB3C({
              target: __sveltets_2_any(),
              props: {
                children: () => {
                  return __sveltets_2_any(0);
                },
                variant: `ghost`,
                href: resolve("/[...path]", { path: "v1/index.html" }),
              },
            });
            Button;
          }
          {
            const $$_nottuB3C = __sveltets_2_ensureComponent(Button);
            new $$_nottuB3C({
              target: __sveltets_2_any(),
              props: {
                children: () => {
                  return __sveltets_2_any(0);
                },
                variant: `ghost`,
                href: `https://github.com/khromov/svelte-bench`,
              },
            });
            Button;
          }
          {
            const $$_nottuB3C = __sveltets_2_ensureComponent(Button);
            new $$_nottuB3C({
              target: __sveltets_2_any(),
              props: {
                children: () => {
                  return __sveltets_2_any(0);
                },
                variant: `outline`,
                size: `icon`,
                "aria-label": `Toggle theme`,
                onclick: toggleTheme,
              },
            });
            if (dark) {
              {
                const $$_nuS4C = __sveltets_2_ensureComponent(Sun);
                new $$_nuS4C({ target: __sveltets_2_any(), props: { size: 16 } });
              }
            } else {
              {
                const $$_nooM4C = __sveltets_2_ensureComponent(Moon);
                new $$_nooM4C({ target: __sveltets_2_any(), props: { size: 16 } });
              }
            }
            Button;
          }
        }
      }
      {
        svelteHTML.createElement("main", { id: `main`, class: `mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14` });
        __sveltets_2_ensureSnippet(children());
      }
      {
        svelteHTML.createElement("footer", {
          class: `mx-auto max-w-6xl border-t px-4 py-6 text-sm text-muted-foreground sm:px-8`,
        });
      }
      Tooltip.Provider;
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
const Layout__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type Layout__SvelteComponent_ = ReturnType<typeof Layout__SvelteComponent_>;
/*Ωignore_endΩ*/ export default Layout__SvelteComponent_;
