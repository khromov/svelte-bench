///<reference types="svelte" />
import { Dialog as DialogPrimitive } from "bits-ui";
function $$render() {
  let {
    ref = $bindable(null),
    type = "button",
    ...restProps
  }: DialogPrimitive.TriggerProps = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_reggirT_evitimirPgolaiD0C = __sveltets_2_ensureComponent(DialogPrimitive.Trigger);
      const $$_reggirT_evitimirPgolaiD0 = new $$_reggirT_evitimirPgolaiD0C({
        target: __sveltets_2_any(),
        props: { ref, "data-slot": `dialog-trigger`, type, ...restProps },
      });
      /*Ωignore_startΩ*/ () => (ref = __sveltets_2_any(null));
      /*Ωignore_endΩ*/ $$_reggirT_evitimirPgolaiD0.$$bindings = "ref";
    }
  };
  return {
    props: {} as any as DialogPrimitive.TriggerProps,
    exports: {},
    bindings: __sveltets_$$bindings("ref"),
    slots: {},
    events: {},
  };
}
const DialogTrigger__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type DialogTrigger__SvelteComponent_ = ReturnType<typeof DialogTrigger__SvelteComponent_>;
/*Ωignore_endΩ*/ export default DialogTrigger__SvelteComponent_;
