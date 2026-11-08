///<reference types="svelte" />
import { cn, type WithElementRef } from "#lib/utils.js";
import type { HTMLTableAttributes } from "svelte/elements";
function $$render() {
  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLTableAttributes> = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      svelteHTML.createElement("div", {
        ...__sveltets_2_empty({ "data-slot": `table-container` }),
        class: `relative w-full overflow-x-auto`,
      });
      {
        const $$_table1 = svelteHTML.createElement("table", {
          ...__sveltets_2_empty({ "data-slot": `table` }),
          class: cn("w-full caption-bottom text-sm", className),
          ...restProps,
        });
        ref = $$_table1;
        __sveltets_2_ensureSnippet(children?.());
      }
    }
  };
  return {
    props: {} as any as WithElementRef<HTMLTableAttributes>,
    exports: {},
    bindings: __sveltets_$$bindings("ref"),
    slots: {},
    events: {},
  };
}
const Table__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type Table__SvelteComponent_ = ReturnType<typeof Table__SvelteComponent_>;
/*Ωignore_endΩ*/ export default Table__SvelteComponent_;
