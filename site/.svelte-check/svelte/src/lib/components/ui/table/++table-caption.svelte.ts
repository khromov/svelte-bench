///<reference types="svelte" />
import { cn, type WithElementRef } from "#lib/utils.js";
import type { HTMLAttributes } from "svelte/elements";
function $$render() {
  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLElement>> = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_caption0 = svelteHTML.createElement("caption", {
        ...__sveltets_2_empty({ "data-slot": `table-caption` }),
        class: cn("text-muted-foreground mt-4 text-sm", className),
        ...restProps,
      });
      ref = $$_caption0;
      __sveltets_2_ensureSnippet(children?.());
    }
  };
  return {
    props: {} as any as WithElementRef<HTMLAttributes<HTMLElement>>,
    exports: {},
    bindings: __sveltets_$$bindings("ref"),
    slots: {},
    events: {},
  };
}
const TableCaption__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type TableCaption__SvelteComponent_ = ReturnType<typeof TableCaption__SvelteComponent_>;
/*Ωignore_endΩ*/ export default TableCaption__SvelteComponent_;
