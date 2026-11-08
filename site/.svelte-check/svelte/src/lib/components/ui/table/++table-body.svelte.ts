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
      const $$_tbody0 = svelteHTML.createElement("tbody", {
        ...__sveltets_2_empty({ "data-slot": `table-body` }),
        class: cn("[&_tr:last-child]:border-0", className),
        ...restProps,
      });
      ref = $$_tbody0;
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
const TableBody__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type TableBody__SvelteComponent_ = ReturnType<typeof TableBody__SvelteComponent_>;
/*Ωignore_endΩ*/ export default TableBody__SvelteComponent_;
