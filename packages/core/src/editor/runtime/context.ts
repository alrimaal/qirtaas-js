// Editor runtime context: reactive, per-instance DI seams that let the editor
// run both inside the Qirtaas SPA (host provides real values) and as the
// embedded SDK (host provides via mount options). Reactive/per-instance state
// uses Vue inject (here); global side-effecting sinks (analytics, transport)
// use module singletons instead. Each seam has a safe default.
import { inject, ref, type InjectionKey, type Ref } from "vue";

/**
 * Read-only dark-mode flag. The host owns theme state (SPA: useTheme();
 * embed SDK later: options.theme), so the editor only consumes it.
 * Default: light.
 */
export const IsDarkKey: InjectionKey<Ref<boolean>> = Symbol(
  "qirtaas.editor.isDark"
);

export function useIsDark(): Ref<boolean> {
  return inject(IsDarkKey, ref(false));
}
