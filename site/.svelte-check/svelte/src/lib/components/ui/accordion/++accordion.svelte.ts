///<reference types="svelte" />
import { Accordion as AccordionPrimitive } from "bits-ui";
import { cn } from "#lib/utils.js";
function $$render() {
  let {
    ref = $bindable(null),
    value = $bindable(),
    class: className,
    ...restProps
  }: AccordionPrimitive.RootProps = $props(); /*Ωignore_startΩ*/
  ref;
  value; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_tooR_evitimirPnoidroccA0C = __sveltets_2_ensureComponent(AccordionPrimitive.Root);
      const $$_tooR_evitimirPnoidroccA0 = new $$_tooR_evitimirPnoidroccA0C({
        target: __sveltets_2_any(),
        props: {
          ref,
          value: value as never,
          "data-slot": `accordion`,
          class: cn("flex w-full flex-col", className),
          ...restProps,
        },
      });
      /*Ωignore_startΩ*/ () => (ref = __sveltets_2_any(null));
      /*Ωignore_endΩ*/ $$_tooR_evitimirPnoidroccA0.$$bindings = "ref";
      /*Ωignore_startΩ*/ () => (value = __sveltets_2_any(null));
      /*Ωignore_endΩ*/ $$_tooR_evitimirPnoidroccA0.$$bindings = "value";
    }
  };
  return {
    props: {} as any as AccordionPrimitive.RootProps,
    exports: {},
    bindings: __sveltets_$$bindings("ref", "value"),
    slots: {},
    events: {},
  };
}
const Accordion__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type Accordion__SvelteComponent_ = ReturnType<typeof Accordion__SvelteComponent_>;
/*Ωignore_endΩ*/ export default Accordion__SvelteComponent_;
