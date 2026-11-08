///<reference types="svelte" />
import { tv, type VariantProps } from "tailwind-variants";

export const tabsListVariants = tv({
  base: "rounded-lg p-[3px] group-data-horizontal/tabs:h-9 data-[variant=line]:rounded-none group/tabs-list inline-flex w-fit items-center justify-center text-muted-foreground group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  variants: {
    variant: {
      default: "bg-muted",
      line: "gap-1 bg-transparent",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type TabsListVariant = VariantProps<typeof tabsListVariants>["variant"];
import { Tabs as TabsPrimitive } from "bits-ui";
import { cn } from "#lib/utils.js";

type $$ComponentProps = TabsPrimitive.ListProps & {
  variant?: TabsListVariant;
};
function $$render() {
  let {
    ref = $bindable(null),
    variant = "default",
    class: className,
    ...restProps
  }: /*Ωignore_startΩ*/ $$ComponentProps /*Ωignore_endΩ*/ = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_tsiL_evitimirPsbaT0C = __sveltets_2_ensureComponent(TabsPrimitive.List);
      const $$_tsiL_evitimirPsbaT0 = new $$_tsiL_evitimirPsbaT0C({
        target: __sveltets_2_any(),
        props: {
          ref,
          "data-slot": `tabs-list`,
          "data-variant": variant,
          class: cn(tabsListVariants({ variant }), className),
          ...restProps,
        },
      });
      /*Ωignore_startΩ*/ () => (ref = __sveltets_2_any(null));
      /*Ωignore_endΩ*/ $$_tsiL_evitimirPsbaT0.$$bindings = "ref";
    }
  };
  return {
    props: {} as any as $$ComponentProps,
    exports: {},
    bindings: __sveltets_$$bindings("ref"),
    slots: {},
    events: {},
  };
}
const TabsList__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type TabsList__SvelteComponent_ = ReturnType<typeof TabsList__SvelteComponent_>;
/*Ωignore_endΩ*/ export default TabsList__SvelteComponent_;
