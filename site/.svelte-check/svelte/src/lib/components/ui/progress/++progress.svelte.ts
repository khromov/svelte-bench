///<reference types="svelte" />
import { Progress as ProgressPrimitive } from "bits-ui";
import { cn, type WithoutChildrenOrChild } from "#lib/utils.js";
function $$render() {
  let {
    ref = $bindable(null),
    class: className,
    max = 100,
    value,
    ...restProps
  }: WithoutChildrenOrChild<ProgressPrimitive.RootProps> = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_tooR_evitimirPssergorP0C = __sveltets_2_ensureComponent(ProgressPrimitive.Root);
      const $$_tooR_evitimirPssergorP0 = new $$_tooR_evitimirPssergorP0C({
        target: __sveltets_2_any(),
        props: {
          children: () => {
            return __sveltets_2_any(0);
          },
          ref,
          "data-slot": `progress`,
          class: cn("bg-muted h-1.5 rounded-full relative flex w-full items-center overflow-x-hidden", className),
          value,
          max,
          ...restProps,
        },
      });
      /*Ωignore_startΩ*/ () => (ref = __sveltets_2_any(null));
      /*Ωignore_endΩ*/ $$_tooR_evitimirPssergorP0.$$bindings = "ref";
      {
        svelteHTML.createElement("div", {
          ...__sveltets_2_empty({ "data-slot": `progress-indicator` }),
          class: `bg-primary size-full flex-1 transition-all`,
          style: `transform: translateX(-${100 - (100 * (value ?? 0)) / (max ?? 1)}%)`,
        });
      }
      ProgressPrimitive.Root;
    }
  };
  return {
    props: {} as any as WithoutChildrenOrChild<ProgressPrimitive.RootProps>,
    exports: {},
    bindings: __sveltets_$$bindings("ref"),
    slots: {},
    events: {},
  };
}
const Progress__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type Progress__SvelteComponent_ = ReturnType<typeof Progress__SvelteComponent_>;
/*Ωignore_endΩ*/ export default Progress__SvelteComponent_;
