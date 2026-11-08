///<reference types="svelte" />
import { Tabs as TabsPrimitive } from "bits-ui";
import { cn } from "#lib/utils.js";
function $$render() {
  let {
    ref = $bindable(null),
    value = $bindable(""),
    class: className,
    ...restProps
  }: TabsPrimitive.RootProps = $props(); /*Ωignore_startΩ*/
  ref;
  value; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_tooR_evitimirPsbaT0C = __sveltets_2_ensureComponent(TabsPrimitive.Root);
      const $$_tooR_evitimirPsbaT0 = new $$_tooR_evitimirPsbaT0C({
        target: __sveltets_2_any(),
        props: {
          ref,
          value,
          "data-slot": `tabs`,
          class: cn("gap-2 group/tabs flex data-horizontal:flex-col", className),
          ...restProps,
        },
      });
      /*Ωignore_startΩ*/ () => (ref = __sveltets_2_any(null));
      /*Ωignore_endΩ*/ $$_tooR_evitimirPsbaT0.$$bindings = "ref";
      /*Ωignore_startΩ*/ () => (value = __sveltets_2_any(null));
      /*Ωignore_endΩ*/ $$_tooR_evitimirPsbaT0.$$bindings = "value";
    }
  };
  return {
    props: {} as any as TabsPrimitive.RootProps,
    exports: {},
    bindings: __sveltets_$$bindings("ref", "value"),
    slots: {},
    events: {},
  };
}
const Tabs__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type Tabs__SvelteComponent_ = ReturnType<typeof Tabs__SvelteComponent_>;
/*Ωignore_endΩ*/ export default Tabs__SvelteComponent_;
