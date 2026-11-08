///<reference types="svelte" />
import { cn, type WithElementRef } from "#lib/utils.js";
import type { HTMLAttributes } from "svelte/elements";
function $$render() {
  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLTableRowElement>> = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_tr0 = svelteHTML.createElement("tr", {
        ...__sveltets_2_empty({ "data-slot": `table-row` }),
        class: cn(
          "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors has-aria-expanded:bg-muted/50",
          className,
        ),
        ...restProps,
      });
      ref = $$_tr0;
      __sveltets_2_ensureSnippet(children?.());
    }
  };
  return {
    props: {} as any as WithElementRef<HTMLAttributes<HTMLTableRowElement>>,
    exports: {},
    bindings: __sveltets_$$bindings("ref"),
    slots: {},
    events: {},
  };
}
const TableRow__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type TableRow__SvelteComponent_ = ReturnType<typeof TableRow__SvelteComponent_>;
/*Ωignore_endΩ*/ export default TableRow__SvelteComponent_;
