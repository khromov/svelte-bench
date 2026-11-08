///<reference types="svelte" />
import { Dialog as DialogPrimitive } from "bits-ui";
function $$render() {
  let { open = $bindable(false), ...restProps }: DialogPrimitive.RootProps = $props(); /*Ωignore_startΩ*/
  open; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_tooR_evitimirPgolaiD0C = __sveltets_2_ensureComponent(DialogPrimitive.Root);
      const $$_tooR_evitimirPgolaiD0 = new $$_tooR_evitimirPgolaiD0C({
        target: __sveltets_2_any(),
        props: { open, ...restProps },
      });
      /*Ωignore_startΩ*/ () => (open = __sveltets_2_any(null));
      /*Ωignore_endΩ*/ $$_tooR_evitimirPgolaiD0.$$bindings = "open";
    }
  };
  return {
    props: {} as any as DialogPrimitive.RootProps,
    exports: {},
    bindings: __sveltets_$$bindings("open"),
    slots: {},
    events: {},
  };
}
const Dialog__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type Dialog__SvelteComponent_ = ReturnType<typeof Dialog__SvelteComponent_>;
/*Ωignore_endΩ*/ export default Dialog__SvelteComponent_;
