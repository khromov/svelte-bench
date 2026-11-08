///<reference types="svelte" />
import { Dialog as DialogPrimitive } from "bits-ui";
function $$render() {
  let {
    ref = $bindable(null),
    type = "button",
    ...restProps
  }: DialogPrimitive.CloseProps = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_esolC_evitimirPgolaiD0C = __sveltets_2_ensureComponent(DialogPrimitive.Close);
      const $$_esolC_evitimirPgolaiD0 = new $$_esolC_evitimirPgolaiD0C({
        target: __sveltets_2_any(),
        props: { ref, "data-slot": `dialog-close`, type, ...restProps },
      });
      /*Ωignore_startΩ*/ () => (ref = __sveltets_2_any(null));
      /*Ωignore_endΩ*/ $$_esolC_evitimirPgolaiD0.$$bindings = "ref";
    }
  };
  return {
    props: {} as any as DialogPrimitive.CloseProps,
    exports: {},
    bindings: __sveltets_$$bindings("ref"),
    slots: {},
    events: {},
  };
}
const DialogClose__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type DialogClose__SvelteComponent_ = ReturnType<typeof DialogClose__SvelteComponent_>;
/*Ωignore_endΩ*/ export default DialogClose__SvelteComponent_;
