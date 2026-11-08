///<reference types="svelte" />
import { Dialog as DialogPrimitive } from "bits-ui";
import { XIcon } from "@lucide/svelte";
import { Button } from "#lib/components/ui/button/index.js";
import { cn, type WithoutChildrenOrChild } from "#lib/utils.js";
import DialogOverlay from "./dialog-overlay.svelte";
import DialogPortal from "./dialog-portal.svelte";
import type { Snippet } from "svelte";
import type { ComponentProps } from "svelte";

type $$ComponentProps = WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
  portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>;
  children: Snippet;
  showCloseButton?: boolean;
};
function $$render() {
  let {
    ref = $bindable(null),
    class: className,
    portalProps,
    children,
    showCloseButton = true,
    ...restProps
  }: /*Ωignore_startΩ*/ $$ComponentProps /*Ωignore_endΩ*/ = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_latroPgolaiD0C = __sveltets_2_ensureComponent(DialogPortal);
      new $$_latroPgolaiD0C({
        target: __sveltets_2_any(),
        props: {
          children: () => {
            return __sveltets_2_any(0);
          },
          ...portalProps,
        },
      });
      {
        const $$_yalrevOgolaiD1C = __sveltets_2_ensureComponent(DialogOverlay);
        new $$_yalrevOgolaiD1C({ target: __sveltets_2_any(), props: {} });
      }
      {
        const $$_tnetnoC_evitimirPgolaiD1C = __sveltets_2_ensureComponent(DialogPrimitive.Content);
        const $$_tnetnoC_evitimirPgolaiD1 = new $$_tnetnoC_evitimirPgolaiD1C({
          target: __sveltets_2_any(),
          props: {
            children: () => {
              return __sveltets_2_any(0);
            },
            ref,
            "data-slot": `dialog-content`,
            class: cn(
              "bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 ring-foreground/10 grid max-w-[calc(100%_-_2rem)] gap-6 rounded-xl p-6 text-sm ring-1 duration-100 sm:max-w-md fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 outline-none",
              className,
            ),
            ...restProps,
          },
        });
        /*Ωignore_startΩ*/ () => (ref = __sveltets_2_any(null));
        /*Ωignore_endΩ*/ $$_tnetnoC_evitimirPgolaiD1.$$bindings = "ref";
        __sveltets_2_ensureSnippet(children?.());
        if (showCloseButton) {
          {
            const $$_esolC_evitimirPgolaiD2C = __sveltets_2_ensureComponent(DialogPrimitive.Close);
            const $$_esolC_evitimirPgolaiD2 = new $$_esolC_evitimirPgolaiD2C({
              target: __sveltets_2_any(),
              props: {
                "data-slot": `dialog-close`,
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
                          variant: `ghost`,
                          class: `absolute top-4 right-4`,
                          size: `icon-sm`,
                          ...props,
                        },
                      });
                      {
                        const $$_nocIX1C = __sveltets_2_ensureComponent(XIcon);
                        new $$_nocIX1C({ target: __sveltets_2_any(), props: {} });
                      }
                      {
                        svelteHTML.createElement("span", { class: `sr-only` });
                      }
                      Button;
                    }
                  };
                  return __sveltets_2_any(0);
                },
              },
            });
            /*Ωignore_startΩ*/ const { child } = $$_esolC_evitimirPgolaiD2.$$prop_def; /*Ωignore_endΩ*/

            DialogPrimitive.Close;
          }
        }
        DialogPrimitive.Content;
      }
      DialogPortal;
    }
  };
  return {
    props: {} as any as $$ComponentProps,
    exports: {},
    bindings: __sveltets_$$bindings("ref"),
    slots: {},
    events: {},
  };
}
const DialogContent__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type DialogContent__SvelteComponent_ = ReturnType<typeof DialogContent__SvelteComponent_>;
/*Ωignore_endΩ*/ export default DialogContent__SvelteComponent_;
