///<reference types="svelte" />
import { Tooltip as TooltipPrimitive } from "bits-ui";
function $$render() {
  let { ...restProps }: TooltipPrimitive.PortalProps = $props();
  async () => {
    {
      const $$_latroP_evitimirPpitlooT0C = __sveltets_2_ensureComponent(TooltipPrimitive.Portal);
      new $$_latroP_evitimirPpitlooT0C({ target: __sveltets_2_any(), props: { ...restProps } });
    }
  };
  return {
    props: {} as any as TooltipPrimitive.PortalProps,
    exports: {},
    bindings: __sveltets_$$bindings(""),
    slots: {},
    events: {},
  };
}
const TooltipPortal__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type TooltipPortal__SvelteComponent_ = ReturnType<typeof TooltipPortal__SvelteComponent_>;
/*Ωignore_endΩ*/ export default TooltipPortal__SvelteComponent_;
