///<reference types="svelte" />
import type { Result } from "#lib/results.js";
import * as Dialog from "#lib/components/ui/dialog/index.js";
import * as Accordion from "#lib/components/ui/accordion/index.js";
import { Button } from "#lib/components/ui/button/index.js";
import { Badge } from "#lib/components/ui/badge/index.js";

type $$ComponentProps = { result: Result };
function $$render() {
  let { result }: /*Ωignore_startΩ*/ $$ComponentProps /*Ωignore_endΩ*/ = $props();
  async () => {
    {
      const $$_tooR_golaiD0C = __sveltets_2_ensureComponent(Dialog.Root);
      new $$_tooR_golaiD0C({
        target: __sveltets_2_any(),
        props: {
          children: () => {
            return __sveltets_2_any(0);
          },
        },
      });
      {
        const $$_reggirT_golaiD1C = __sveltets_2_ensureComponent(Dialog.Trigger);
        const $$_reggirT_golaiD1 = new $$_reggirT_golaiD1C({
          target: __sveltets_2_any(),
          props: {
            child: ({ props }) => {
              async () /*Ωignore_positionΩ*/ => {
                {
                  const $$_nottuB0C = __sveltets_2_ensureComponent(Button);
                  new $$_nottuB0C({
                    target: __sveltets_2_any(),
                    props: {
                      children: () => {
                        return __sveltets_2_any(0);
                      },
                      variant: `outline`,
                      size: `sm`,
                      ...props,
                    },
                  });
                  result.numSamples;
                  Button;
                }
              };
              return __sveltets_2_any(0);
            },
          },
        });
        /*Ωignore_startΩ*/ const { child } = $$_reggirT_golaiD1.$$prop_def;
        /*Ωignore_endΩ*/ Dialog.Trigger;
      }
      {
        const $$_tnetnoC_golaiD1C = __sveltets_2_ensureComponent(Dialog.Content);
        new $$_tnetnoC_golaiD1C({
          target: __sveltets_2_any(),
          props: {
            children: () => {
              return __sveltets_2_any(0);
            },
            class: `max-h-[85dvh] overflow-y-auto sm:max-w-4xl`,
          },
        });
        {
          const $$_redaeH_golaiD2C = __sveltets_2_ensureComponent(Dialog.Header);
          new $$_redaeH_golaiD2C({
            target: __sveltets_2_any(),
            props: {
              children: () => {
                return __sveltets_2_any(0);
              },
            },
          });
          {
            const $$_eltiT_golaiD3C = __sveltets_2_ensureComponent(Dialog.Title);
            new $$_eltiT_golaiD3C({
              target: __sveltets_2_any(),
              props: {
                children: () => {
                  return __sveltets_2_any(0);
                },
              },
            });
            result.testName;
            Dialog.Title;
          }
          {
            const $$_noitpircseD_golaiD3C = __sveltets_2_ensureComponent(Dialog.Description);
            new $$_noitpircseD_golaiD3C({
              target: __sveltets_2_any(),
              props: {
                children: () => {
                  return __sveltets_2_any(0);
                },
              },
            });
            result.modelId;
            result.numCorrect;
            result.numSamples;
            (result.pass1 * 100).toFixed(1);
            (result.pass10 * 100).toFixed(1);
            Dialog.Description;
          }
          Dialog.Header;
        }
        {
          const $$_tooR_noidroccA2C = __sveltets_2_ensureComponent(Accordion.Root);
          new $$_tooR_noidroccA2C({
            target: __sveltets_2_any(),
            props: {
              children: () => {
                return __sveltets_2_any(0);
              },
              type: `multiple`,
            },
          });
          for (let sample of __sveltets_2_ensureArray(result.samples ?? [])) {
            {
              const $$_metI_noidroccA3C = __sveltets_2_ensureComponent(Accordion.Item);
              new $$_metI_noidroccA3C({
                target: __sveltets_2_any(),
                props: {
                  children: () => {
                    return __sveltets_2_any(0);
                  },
                  value: String(sample.index),
                },
              });
              {
                const $$_reggirT_noidroccA4C = __sveltets_2_ensureComponent(Accordion.Trigger);
                new $$_reggirT_noidroccA4C({
                  target: __sveltets_2_any(),
                  props: {
                    children: () => {
                      return __sveltets_2_any(0);
                    },
                  },
                });
                sample.index + 1;
                {
                  const $$_egdaB5C = __sveltets_2_ensureComponent(Badge);
                  new $$_egdaB5C({
                    target: __sveltets_2_any(),
                    props: {
                      children: () => {
                        return __sveltets_2_any(0);
                      },
                      variant: `secondary`,
                      class: sample.success ? "text-green-700 dark:text-green-400" : "text-destructive",
                    },
                  });
                  sample.success ? "Passed" : "Failed";
                  Badge;
                }
                Accordion.Trigger;
              }
              {
                const $$_tnetnoC_noidroccA4C = __sveltets_2_ensureComponent(Accordion.Content);
                new $$_tnetnoC_noidroccA4C({
                  target: __sveltets_2_any(),
                  props: {
                    children: () => {
                      return __sveltets_2_any(0);
                    },
                  },
                });
                if (sample.temperature !== undefined) {
                  {
                    svelteHTML.createElement("p", { class: `mb-3 text-muted-foreground` });
                    sample.temperature;
                  }
                }
                if (sample.errors?.length) {
                  {
                    svelteHTML.createElement("pre", {
                      class: `mb-4 rounded-md bg-destructive/10 p-4 text-destructive`,
                    });
                    sample.errors.join("\n");
                  }
                }
                {
                  svelteHTML.createElement("pre", { class: `rounded-md bg-muted p-4 text-xs leading-relaxed` });
                  {
                    svelteHTML.createElement("code", {});
                    sample.code;
                  }
                }
                Accordion.Content;
              }
              Accordion.Item;
            }
          }
          Accordion.Root;
        }
        Dialog.Content;
      }
      Dialog.Root;
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
const Samples__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type Samples__SvelteComponent_ = ReturnType<typeof Samples__SvelteComponent_>;
/*Ωignore_endΩ*/ export default Samples__SvelteComponent_;
