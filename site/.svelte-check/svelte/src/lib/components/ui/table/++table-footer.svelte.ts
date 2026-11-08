///<reference types="svelte" />
import { cn, type WithElementRef } from "#lib/utils.js";
import type { HTMLAttributes } from "svelte/elements";
function $$render() {
  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLTableSectionElement>> = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_tfoot0 = svelteHTML.createElement("tfoot", {
        ...__sveltets_2_empty({ "data-slot": `table-footer` }),
        class: cn("bg-muted/50 border-t font-medium [&>tr]:last:border-b-0", className),
        ...restProps,
      });
      ref = $$_tfoot0;
      __sveltets_2_ensureSnippet(children?.());
    }
  };
  return {
    props: {} as any as WithElementRef<HTMLAttributes<HTMLTableSectionElement>>,
    exports: {},
    bindings: __sveltets_$$bindings("ref"),
    slots: {},
    events: {},
  };
}
const TableFooter__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type TableFooter__SvelteComponent_ = ReturnType<typeof TableFooter__SvelteComponent_>;
/*Ωignore_endΩ*/ export default TableFooter__SvelteComponent_;
