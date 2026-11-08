///<reference types="svelte" />
import { Accordion as AccordionPrimitive } from "bits-ui";
import { cn } from "#lib/utils.js";
function $$render() {
  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: AccordionPrimitive.ItemProps = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_metI_evitimirPnoidroccA0C = __sveltets_2_ensureComponent(AccordionPrimitive.Item);
      const $$_metI_evitimirPnoidroccA0 = new $$_metI_evitimirPnoidroccA0C({
        target: __sveltets_2_any(),
        props: { ref, "data-slot": `accordion-item`, class: cn("not-last:border-b", className), ...restProps },
      });
      /*Ωignore_startΩ*/ () => (ref = __sveltets_2_any(null));
      /*Ωignore_endΩ*/ $$_metI_evitimirPnoidroccA0.$$bindings = "ref";
    }
  };
  return {
    props: {} as any as AccordionPrimitive.ItemProps,
    exports: {},
    bindings: __sveltets_$$bindings("ref"),
    slots: {},
    events: {},
  };
}
const AccordionItem__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type AccordionItem__SvelteComponent_ = ReturnType<typeof AccordionItem__SvelteComponent_>;
/*Ωignore_endΩ*/ export default AccordionItem__SvelteComponent_;
