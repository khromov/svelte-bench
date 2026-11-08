///<reference types="svelte" />
import { Tooltip as TooltipPrimitive } from "bits-ui";
function $$render<T = never>() {
  let { ref = $bindable(null), ...restProps }: TooltipPrimitive.TriggerProps<T> = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_reggirT_evitimirPpitlooT0C = __sveltets_2_ensureComponent(TooltipPrimitive.Trigger);
      const $$_reggirT_evitimirPpitlooT0 = new $$_reggirT_evitimirPpitlooT0C({
        target: __sveltets_2_any(),
        props: { ref, "data-slot": `tooltip-trigger`, ...restProps },
      });
      /*Ωignore_startΩ*/ () => (ref = __sveltets_2_any(null));
      /*Ωignore_endΩ*/ $$_reggirT_evitimirPpitlooT0.$$bindings = "ref";
    }
  };
  return {
    props: {} as any as TooltipPrimitive.TriggerProps<T>,
    exports: {},
    bindings: __sveltets_$$bindings("ref"),
    slots: {},
    events: {},
  };
}
class __sveltets_Render<T = never> {
  props(): ReturnType<typeof $$render<T>>["props"] {
    return null as any;
  }
  events(): ReturnType<typeof $$render<T>>["events"] {
    return null as any;
  }
  slots(): ReturnType<typeof $$render<T>>["slots"] {
    return null as any;
  }
  bindings() {
    return __sveltets_$$bindings("ref");
  }
  exports() {
    return {};
  }
}

interface $$IsomorphicComponent {
  new <T = never>(
    options: import("svelte").ComponentConstructorOptions<ReturnType<__sveltets_Render<T>["props"]>>,
  ): import("svelte").SvelteComponent<
    ReturnType<__sveltets_Render<T>["props"]>,
    ReturnType<__sveltets_Render<T>["events"]>,
    ReturnType<__sveltets_Render<T>["slots"]>
  > & { $$bindings?: ReturnType<__sveltets_Render<T>["bindings"]> } & ReturnType<__sveltets_Render<T>["exports"]>;
  <T = never>(
    internal: unknown,
    props: ReturnType<__sveltets_Render<T>["props"]> & {},
  ): ReturnType<__sveltets_Render<T>["exports"]>;
  z_$$bindings?: ReturnType<__sveltets_Render<any>["bindings"]>;
}
const TooltipTrigger__SvelteComponent_: $$IsomorphicComponent = null as any;
/*Ωignore_startΩ*/ type TooltipTrigger__SvelteComponent_<T = never> = InstanceType<
  typeof TooltipTrigger__SvelteComponent_<T>
>;
/*Ωignore_endΩ*/ export default TooltipTrigger__SvelteComponent_;
