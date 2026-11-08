///<reference types="svelte" />
import { cn, type WithElementRef } from "#lib/utils.js";
import type { HTMLTdAttributes } from "svelte/elements";
function $$render() {
  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLTdAttributes> = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_td0 = svelteHTML.createElement("td", {
        ...__sveltets_2_empty({ "data-slot": `table-cell` }),
        class: cn("p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", className),
        ...restProps,
      });
      ref = $$_td0;
      __sveltets_2_ensureSnippet(children?.());
    }
  };
  return {
    props: {} as any as WithElementRef<HTMLTdAttributes>,
    exports: {},
    bindings: __sveltets_$$bindings("ref"),
    slots: {},
    events: {},
  };
}
const TableCell__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type TableCell__SvelteComponent_ = ReturnType<typeof TableCell__SvelteComponent_>;
/*Ωignore_endΩ*/ export default TableCell__SvelteComponent_;
