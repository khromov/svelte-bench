///<reference types="svelte" />
import { Tooltip as TooltipPrimitive } from "bits-ui";
function $$render<T = never>() {
  let { open = $bindable(false), ...restProps }: TooltipPrimitive.RootProps<T> = $props(); /*Ωignore_startΩ*/
  open; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_tooR_evitimirPpitlooT0C = __sveltets_2_ensureComponent(TooltipPrimitive.Root);
      const $$_tooR_evitimirPpitlooT0 = new $$_tooR_evitimirPpitlooT0C({
        target: __sveltets_2_any(),
        props: { open, ...restProps },
      });
      /*Ωignore_startΩ*/ () => (open = __sveltets_2_any(null));
      /*Ωignore_endΩ*/ $$_tooR_evitimirPpitlooT0.$$bindings = "open";
    }
  };
  return {
    props: {} as any as TooltipPrimitive.RootProps<T>,
    exports: {},
    bindings: __sveltets_$$bindings("open"),
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
    return __sveltets_$$bindings("open");
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
const Tooltip__SvelteComponent_: $$IsomorphicComponent = null as any;
/*Ωignore_startΩ*/ type Tooltip__SvelteComponent_<T = never> = InstanceType<typeof Tooltip__SvelteComponent_<T>>;
/*Ωignore_endΩ*/ export default Tooltip__SvelteComponent_;
