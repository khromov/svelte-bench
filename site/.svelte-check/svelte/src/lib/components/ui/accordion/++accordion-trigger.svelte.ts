///<reference types="svelte" />
import { Accordion as AccordionPrimitive } from "bits-ui";
import { ChevronDownIcon, ChevronUpIcon } from "@lucide/svelte";
import { cn, type WithoutChild } from "#lib/utils.js";

type $$ComponentProps = WithoutChild<AccordionPrimitive.TriggerProps> & {
  level?: AccordionPrimitive.HeaderProps["level"];
};
function $$render() {
  let {
    ref = $bindable(null),
    class: className,
    level = 3,
    children,
    ...restProps
  }: /*Ωignore_startΩ*/ $$ComponentProps /*Ωignore_endΩ*/ = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_redaeH_evitimirPnoidroccA0C = __sveltets_2_ensureComponent(AccordionPrimitive.Header);
      new $$_redaeH_evitimirPnoidroccA0C({
        target: __sveltets_2_any(),
        props: {
          children: () => {
            return __sveltets_2_any(0);
          },
          level,
          class: `flex`,
        },
      });
      {
        const $$_reggirT_evitimirPnoidroccA1C = __sveltets_2_ensureComponent(AccordionPrimitive.Trigger);
        const $$_reggirT_evitimirPnoidroccA1 = new $$_reggirT_evitimirPnoidroccA1C({
          target: __sveltets_2_any(),
          props: {
            children: () => {
              return __sveltets_2_any(0);
            },
            "data-slot": `accordion-trigger`,
            ref,
            class: cn(
              "focus-visible:ring-ring/50 focus-visible:border-ring focus-visible:after:border-ring **:data-[slot=accordion-trigger-icon]:text-muted-foreground rounded-md py-4 text-left text-sm font-medium hover:underline focus-visible:ring-3 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 group/accordion-trigger relative flex flex-1 items-start justify-between border border-transparent transition-all outline-none disabled:pointer-events-none disabled:opacity-50",
              className,
            ),
            ...restProps,
          },
        });
        /*Ωignore_startΩ*/ () => (ref = __sveltets_2_any(null));
        /*Ωignore_endΩ*/ $$_reggirT_evitimirPnoidroccA1.$$bindings = "ref";
        __sveltets_2_ensureSnippet(children?.());
        {
          const $$_nocInwoDnorvehC2C = __sveltets_2_ensureComponent(ChevronDownIcon);
          new $$_nocInwoDnorvehC2C({
            target: __sveltets_2_any(),
            props: {
              "data-slot": `accordion-trigger-icon`,
              class: `pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden`,
            },
          });
        }
        {
          const $$_nocIpUnorvehC2C = __sveltets_2_ensureComponent(ChevronUpIcon);
          new $$_nocIpUnorvehC2C({
            target: __sveltets_2_any(),
            props: {
              "data-slot": `accordion-trigger-icon`,
              class: `pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline`,
            },
          });
        }
        AccordionPrimitive.Trigger;
      }
      AccordionPrimitive.Header;
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
const AccordionTrigger__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type AccordionTrigger__SvelteComponent_ = ReturnType<typeof AccordionTrigger__SvelteComponent_>;
/*Ωignore_endΩ*/ export default AccordionTrigger__SvelteComponent_;
