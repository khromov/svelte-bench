///<reference types="svelte" />
import { cn, type WithElementRef } from "#lib/utils.js";
import type { HTMLThAttributes } from "svelte/elements";
function $$render() {
  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLThAttributes> = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_th0 = svelteHTML.createElement("th", {
        ...__sveltets_2_empty({ "data-slot": `table-head` }),
        class: cn(
          "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0",
          className,
        ),
        ...restProps,
      });
      ref = $$_th0;
      __sveltets_2_ensureSnippet(children?.());
    }
  };
  return {
    props: {} as any as WithElementRef<HTMLThAttributes>,
    exports: {},
    bindings: __sveltets_$$bindings("ref"),
    slots: {},
    events: {},
  };
}
const TableHead__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type TableHead__SvelteComponent_ = ReturnType<typeof TableHead__SvelteComponent_>;
/*Ωignore_endΩ*/ export default TableHead__SvelteComponent_;
