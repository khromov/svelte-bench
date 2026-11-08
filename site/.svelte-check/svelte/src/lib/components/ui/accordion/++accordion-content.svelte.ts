///<reference types="svelte" />
import { Accordion as AccordionPrimitive } from "bits-ui";
import { cn, type WithoutChild } from "#lib/utils.js";
function $$render() {
  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithoutChild<AccordionPrimitive.ContentProps> = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_tnetnoC_evitimirPnoidroccA0C = __sveltets_2_ensureComponent(AccordionPrimitive.Content);
      const $$_tnetnoC_evitimirPnoidroccA0 = new $$_tnetnoC_evitimirPnoidroccA0C({
        target: __sveltets_2_any(),
        props: {
          children: () => {
            return __sveltets_2_any(0);
          },
          ref,
          "data-slot": `accordion-content`,
          class: `data-open:animate-accordion-down data-closed:animate-accordion-up text-sm overflow-hidden`,
          ...restProps,
        },
      });
      /*Ωignore_startΩ*/ () => (ref = __sveltets_2_any(null));
      /*Ωignore_endΩ*/ $$_tnetnoC_evitimirPnoidroccA0.$$bindings = "ref";
      {
        svelteHTML.createElement("div", {
          class: cn(
            "pt-0 pb-4 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
            className,
          ),
        });
        __sveltets_2_ensureSnippet(children?.());
      }
      AccordionPrimitive.Content;
    }
  };
  return {
    props: {} as any as WithoutChild<AccordionPrimitive.ContentProps>,
    exports: {},
    bindings: __sveltets_$$bindings("ref"),
    slots: {},
    events: {},
  };
}
const AccordionContent__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type AccordionContent__SvelteComponent_ = ReturnType<typeof AccordionContent__SvelteComponent_>;
/*Ωignore_endΩ*/ export default AccordionContent__SvelteComponent_;
