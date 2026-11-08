///<reference types="svelte" />
import { Tooltip as TooltipPrimitive } from "bits-ui";
import { cn } from "#lib/utils.js";
import type { WithoutChildrenOrChild } from "#lib/utils.js";
import TooltipPortal from "./tooltip-portal.svelte";
import type { ComponentProps } from "svelte";

type $$ComponentProps = TooltipPrimitive.ContentProps & {
  arrowClasses?: string;
  portalProps?: WithoutChildrenOrChild<ComponentProps<typeof TooltipPortal>>;
};
function $$render() {
  let {
    ref = $bindable(null),
    class: className,
    sideOffset = 0,
    side = "top",
    children,
    arrowClasses,
    portalProps,
    ...restProps
  }: /*Ωignore_startΩ*/ $$ComponentProps /*Ωignore_endΩ*/ = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_latroPpitlooT0C = __sveltets_2_ensureComponent(TooltipPortal);
      new $$_latroPpitlooT0C({
        target: __sveltets_2_any(),
        props: {
          children: () => {
            return __sveltets_2_any(0);
          },
          ...portalProps,
        },
      });
      {
        const $$_tnetnoC_evitimirPpitlooT1C = __sveltets_2_ensureComponent(TooltipPrimitive.Content);
        const $$_tnetnoC_evitimirPpitlooT1 = new $$_tnetnoC_evitimirPpitlooT1C({
          target: __sveltets_2_any(),
          props: {
            children: () => {
              return __sveltets_2_any(0);
            },
            ref,
            "data-slot": `tooltip-content`,
            sideOffset,
            side,
            class: cn(
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs has-data-[slot=kbd]:pr-1.5 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm z-50 w-fit max-w-xs origin-(--bits-tooltip-content-transform-origin) bg-foreground text-background",
              className,
            ),
            ...restProps,
          },
        });
        /*Ωignore_startΩ*/ () => (ref = __sveltets_2_any(null));
        /*Ωignore_endΩ*/ $$_tnetnoC_evitimirPpitlooT1.$$bindings = "ref";
        __sveltets_2_ensureSnippet(children?.());
        {
          const $$_worrA_evitimirPpitlooT2C = __sveltets_2_ensureComponent(TooltipPrimitive.Arrow);
          const $$_worrA_evitimirPpitlooT2 = new $$_worrA_evitimirPpitlooT2C({
            target: __sveltets_2_any(),
            props: {
              child: ({ props }) => {
                async () /*Ωignore_positionΩ*/ => {
                  {
                    svelteHTML.createElement("div", {
                      class: cn(
                        "size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] z-50 bg-foreground fill-foreground data-[side=bottom]:-translate-x-1/2 data-[side=bottom]:-translate-y-[calc(-50%_+_1px)] data-[side=left]:-translate-y-[calc(50%_-_3px)] data-[side=right]:translate-x-[calc(50%_+_2px)] data-[side=right]:translate-y-1/2 data-[side=top]:translate-x-1/2 data-[side=top]:translate-y-[calc(-50%_+_2px)]",
                        arrowClasses,
                      ),
                      ...props,
                    });
                  }
                };
                return __sveltets_2_any(0);
              },
            },
          });
          /*Ωignore_startΩ*/ const { child } = $$_worrA_evitimirPpitlooT2.$$prop_def; /*Ωignore_endΩ*/

          TooltipPrimitive.Arrow;
        }
        TooltipPrimitive.Content;
      }
      TooltipPortal;
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
const TooltipContent__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type TooltipContent__SvelteComponent_ = ReturnType<typeof TooltipContent__SvelteComponent_>;
/*Ωignore_endΩ*/ export default TooltipContent__SvelteComponent_;
