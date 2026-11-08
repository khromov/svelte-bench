///<reference types="svelte" />
import { Dialog as DialogPrimitive } from "bits-ui";
import { cn } from "#lib/utils.js";
function $$render() {
  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: DialogPrimitive.OverlayProps = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_yalrevO_evitimirPgolaiD0C = __sveltets_2_ensureComponent(DialogPrimitive.Overlay);
      const $$_yalrevO_evitimirPgolaiD0 = new $$_yalrevO_evitimirPgolaiD0C({
        target: __sveltets_2_any(),
        props: {
          ref,
          "data-slot": `dialog-overlay`,
          class: cn(
            "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 isolate z-50",
            className,
          ),
          ...restProps,
        },
      });
      /*Ωignore_startΩ*/ () => (ref = __sveltets_2_any(null));
      /*Ωignore_endΩ*/ $$_yalrevO_evitimirPgolaiD0.$$bindings = "ref";
    }
  };
  return {
    props: {} as any as DialogPrimitive.OverlayProps,
    exports: {},
    bindings: __sveltets_$$bindings("ref"),
    slots: {},
    events: {},
  };
}
const DialogOverlay__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type DialogOverlay__SvelteComponent_ = ReturnType<typeof DialogOverlay__SvelteComponent_>;
/*Ωignore_endΩ*/ export default DialogOverlay__SvelteComponent_;
