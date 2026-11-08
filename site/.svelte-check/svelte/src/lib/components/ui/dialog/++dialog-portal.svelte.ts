///<reference types="svelte" />
import { Dialog as DialogPrimitive } from "bits-ui";
function $$render() {
  let { ...restProps }: DialogPrimitive.PortalProps = $props();
  async () => {
    {
      const $$_latroP_evitimirPgolaiD0C = __sveltets_2_ensureComponent(DialogPrimitive.Portal);
      new $$_latroP_evitimirPgolaiD0C({ target: __sveltets_2_any(), props: { ...restProps } });
    }
  };
  return {
    props: {} as any as DialogPrimitive.PortalProps,
    exports: {},
    bindings: __sveltets_$$bindings(""),
    slots: {},
    events: {},
  };
}
const DialogPortal__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type DialogPortal__SvelteComponent_ = ReturnType<typeof DialogPortal__SvelteComponent_>;
/*Ωignore_endΩ*/ export default DialogPortal__SvelteComponent_;
