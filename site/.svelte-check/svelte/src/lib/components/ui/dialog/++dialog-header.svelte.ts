///<reference types="svelte" />
import { cn, type WithElementRef } from "#lib/utils.js";
import type { HTMLAttributes } from "svelte/elements";
function $$render() {
  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_div0 = svelteHTML.createElement("div", {
        ...__sveltets_2_empty({ "data-slot": `dialog-header` }),
        class: cn("gap-2 flex flex-col", className),
        ...restProps,
      });
      ref = $$_div0;
      __sveltets_2_ensureSnippet(children?.());
    }
  };
  return {
    props: {} as any as WithElementRef<HTMLAttributes<HTMLDivElement>>,
    exports: {},
    bindings: __sveltets_$$bindings("ref"),
    slots: {},
    events: {},
  };
}
const DialogHeader__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type DialogHeader__SvelteComponent_ = ReturnType<typeof DialogHeader__SvelteComponent_>;
/*Ωignore_endΩ*/ export default DialogHeader__SvelteComponent_;
