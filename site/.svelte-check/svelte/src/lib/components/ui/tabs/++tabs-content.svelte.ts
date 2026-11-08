///<reference types="svelte" />
import { Tabs as TabsPrimitive } from "bits-ui";
import { cn } from "#lib/utils.js";
function $$render() {
  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: TabsPrimitive.ContentProps = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_tnetnoC_evitimirPsbaT0C = __sveltets_2_ensureComponent(TabsPrimitive.Content);
      const $$_tnetnoC_evitimirPsbaT0 = new $$_tnetnoC_evitimirPsbaT0C({
        target: __sveltets_2_any(),
        props: { ref, "data-slot": `tabs-content`, class: cn("text-sm flex-1 outline-none", className), ...restProps },
      });
      /*Ωignore_startΩ*/ () => (ref = __sveltets_2_any(null));
      /*Ωignore_endΩ*/ $$_tnetnoC_evitimirPsbaT0.$$bindings = "ref";
    }
  };
  return {
    props: {} as any as TabsPrimitive.ContentProps,
    exports: {},
    bindings: __sveltets_$$bindings("ref"),
    slots: {},
    events: {},
  };
}
const TabsContent__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type TabsContent__SvelteComponent_ = ReturnType<typeof TabsContent__SvelteComponent_>;
/*Ωignore_endΩ*/ export default TabsContent__SvelteComponent_;
