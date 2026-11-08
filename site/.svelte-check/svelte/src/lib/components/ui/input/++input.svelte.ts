///<reference types="svelte" />
import { cn, type WithElementRef } from "#lib/utils.js";
import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
type InputType = Exclude<HTMLInputTypeAttribute, "file">;

type Props = WithElementRef<
  Omit<HTMLInputAttributes, "type"> & ({ type: "file"; files?: FileList } | { type?: InputType; files?: undefined })
>;
function $$render() {
  let {
    ref = $bindable(null),
    value = $bindable(),
    type,
    files = $bindable(),
    class: className,
    "data-slot": dataSlot = "input",
    ...restProps
  }: Props = $props(); /*Ωignore_startΩ*/
  ref;
  value;
  files; /*Ωignore_endΩ*/
  async () => {
    if (type === "file") {
      {
        const $$_input0 = svelteHTML.createElement("input", {
          ...__sveltets_2_empty({ "data-slot": dataSlot }),
          class: cn(
            "dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-9 rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] file:h-7 file:text-sm file:font-medium focus-visible:ring-3 aria-invalid:ring-3 md:text-sm w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            className,
          ),
          type: `file`,
          "bind:files": files,
          "bind:value": value,
          ...restProps,
        });
        ref = $$_input0;
        /*Ωignore_startΩ*/ () => (files = __sveltets_2_any(null));
        /*Ωignore_endΩ*/ /*Ωignore_startΩ*/ () => (value = __sveltets_2_any(null)); /*Ωignore_endΩ*/
      }
    } else {
      {
        const $$_input0 = svelteHTML.createElement("input", {
          ...__sveltets_2_empty({ "data-slot": dataSlot }),
          class: cn(
            "dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-9 rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] file:h-7 file:text-sm file:font-medium focus-visible:ring-3 aria-invalid:ring-3 md:text-sm w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            className,
          ),
          type,
          "bind:value": value,
          ...restProps,
        });
        ref = $$_input0;
        /*Ωignore_startΩ*/ () => (value = __sveltets_2_any(null)); /*Ωignore_endΩ*/
      }
    }
  };
  return {
    props: {} as any as Props,
    exports: {},
    bindings: __sveltets_$$bindings("ref", "value", "files"),
    slots: {},
    events: {},
  };
}
const Input__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type Input__SvelteComponent_ = ReturnType<typeof Input__SvelteComponent_>;
/*Ωignore_endΩ*/ export default Input__SvelteComponent_;
