///<reference types="svelte" />
import { Dialog as DialogPrimitive } from "bits-ui";
import { Button } from "#lib/components/ui/button/index.js";
import { cn, type WithElementRef } from "#lib/utils.js";
import type { HTMLAttributes } from "svelte/elements";

type $$ComponentProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
  showCloseButton?: boolean;
};
function $$render() {
  let {
    ref = $bindable(null),
    class: className,
    children,
    showCloseButton = false,
    ...restProps
  }: /*Ωignore_startΩ*/ $$ComponentProps /*Ωignore_endΩ*/ = $props(); /*Ωignore_startΩ*/
  ref; /*Ωignore_endΩ*/
  async () => {
    {
      const $$_div0 = svelteHTML.createElement("div", {
        ...__sveltets_2_empty({ "data-slot": `dialog-footer` }),
        class: cn("gap-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className),
        ...restProps,
      });
      ref = $$_div0;
      __sveltets_2_ensureSnippet(children?.());
      if (showCloseButton) {
        {
          const $$_esolC_evitimirPgolaiD1C = __sveltets_2_ensureComponent(DialogPrimitive.Close);
          const $$_esolC_evitimirPgolaiD1 = new $$_esolC_evitimirPgolaiD1C({
            target: __sveltets_2_any(),
            props: {
              child: ({ props }) => {
                async () /*Ωignore_positionΩ*/ => {
                  {
                    const $$_nottuB0C = __sveltets_2_ensureComponent(Button);
                    new $$_nottuB0C({
                      target: __sveltets_2_any(),
                      props: {
                        children: () => {
                          return __sveltets_2_any(0);
                        },
                        variant: `outline`,
                        ...props,
                      },
                    });
                    Button;
                  }
                };
                return __sveltets_2_any(0);
              },
            },
          });
          /*Ωignore_startΩ*/ const { child } = $$_esolC_evitimirPgolaiD1.$$prop_def; /*Ωignore_endΩ*/

          DialogPrimitive.Close;
        }
      }
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
const DialogFooter__SvelteComponent_ = __sveltets_2_fn_component($$render());
/*Ωignore_startΩ*/ type DialogFooter__SvelteComponent_ = ReturnType<typeof DialogFooter__SvelteComponent_>;
/*Ωignore_endΩ*/ export default DialogFooter__SvelteComponent_;
