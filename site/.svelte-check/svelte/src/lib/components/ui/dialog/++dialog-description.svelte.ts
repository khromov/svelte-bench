///<reference types="svelte" />
import { Dialog as DialogPrimitive } from "bits-ui";
import { cn } from "#lib/utils.js";
function $$render() {
  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: DialogPrimitive.DescriptionProps = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_noitpircseD_evitimirPgolaiD0C = __sveltets_2_ensureComponent(DialogPrimitive.Description);
      const $$_noitpircseD_evitimirPgolaiD0 = new $$_noitpircseD_evitimirPgolaiD0C({
        target: __sveltets_2_any(),
        props: {
          ref,
          "data-slot": `dialog-description`,
          class: cn(
            "text-muted-foreground *:[a]:hover:text-foreground text-sm *:[a]:underline *:[a]:underline-offset-3",
            className,
          ),
          ...restProps,
        },
      });
      /*Ωignore_startΩ*/ () => (ref = __sveltets_2_any(null));
      /*Ωignore_endΩ*/ $$_noitpircseD_evitimirPgolaiD0.$$bindings = "ref";
    }
  };
  return {
    props: {} as any as DialogPrimitive.DescriptionProps,
    exports: {},
    bindings: __sveltets_$$bindings("ref"),
    slots: {},
    events: {},
  };
}
const DialogDescription__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type DialogDescription__SvelteComponent_ = ReturnType<typeof DialogDescription__SvelteComponent_>;
/*Ωignore_endΩ*/ export default DialogDescription__SvelteComponent_;
