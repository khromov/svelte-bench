///<reference types="svelte" />
import { Dialog as DialogPrimitive } from "bits-ui";
import { cn } from "#lib/utils.js";
function $$render() {
  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: DialogPrimitive.TitleProps = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_eltiT_evitimirPgolaiD0C = __sveltets_2_ensureComponent(DialogPrimitive.Title);
      const $$_eltiT_evitimirPgolaiD0 = new $$_eltiT_evitimirPgolaiD0C({
        target: __sveltets_2_any(),
        props: {
          ref,
          "data-slot": `dialog-title`,
          class: cn("cn-font-heading leading-none font-medium", className),
          ...restProps,
        },
      });
      /*Ωignore_startΩ*/ () => (ref = __sveltets_2_any(null));
      /*Ωignore_endΩ*/ $$_eltiT_evitimirPgolaiD0.$$bindings = "ref";
    }
  };
  return {
    props: {} as any as DialogPrimitive.TitleProps,
    exports: {},
    bindings: __sveltets_$$bindings("ref"),
    slots: {},
    events: {},
  };
}
const DialogTitle__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type DialogTitle__SvelteComponent_ = ReturnType<typeof DialogTitle__SvelteComponent_>;
/*Ωignore_endΩ*/ export default DialogTitle__SvelteComponent_;
