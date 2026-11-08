///<reference types="svelte" />
import { Tooltip as TooltipPrimitive } from "bits-ui";
function $$render() {
  let { delayDuration = 0, ...restProps }: TooltipPrimitive.ProviderProps = $props();
  async () => {
    {
      const $$_redivorP_evitimirPpitlooT0C = __sveltets_2_ensureComponent(TooltipPrimitive.Provider);
      new $$_redivorP_evitimirPpitlooT0C({ target: __sveltets_2_any(), props: { delayDuration, ...restProps } });
    }
  };
  return {
    props: {} as any as TooltipPrimitive.ProviderProps,
    exports: {},
    bindings: __sveltets_$$bindings(""),
    slots: {},
    events: {},
  };
}
const TooltipProvider__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type TooltipProvider__SvelteComponent_ = ReturnType<typeof TooltipProvider__SvelteComponent_>;
/*Ωignore_endΩ*/ export default TooltipProvider__SvelteComponent_;
