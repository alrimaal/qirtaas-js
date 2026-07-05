// Qirtaas PrimeVue brand preset (purple). Shared by the SPA and the embedded
// editor so their PrimeVue chrome (toolbar, dialogs, popovers) can't drift.
// Each consumer passes its own darkModeSelector (.dark-mode in the SPA,
// .qirtaas-dark in the embed).
import Aura from "@primeuix/themes/aura";
import { definePreset, palette } from "@primeuix/themes";
import { Theme } from "@primeuix/styled";

// Build-time flag (Vite `define`). True only in the @qirtaas/vue build that
// EXTERNALIZES PrimeVue — i.e. the embed shares the host app's PrimeVue. False
// (or absent) when PrimeVue is bundled (core UMD, @qirtaas/react), where the
// embed owns the only PrimeVue instance and must theme it itself.
declare const __QIRTAAS_HOST_PRIMEVUE__: boolean | undefined;

const lightPrimary = palette("#410322") as Record<string, string>;
const darkPrimary = palette("#ae3773") as Record<string, string>;

export const qirtaasPreset = definePreset(Aura, {
  semantic: {
    primary: lightPrimary,
    colorScheme: {
      light: {
        primary: {
          ...lightPrimary,
          contrastColor: "#ffffff",
          hoverColor: lightPrimary["600"],
        },
      },
      dark: {
        primary: {
          ...darkPrimary,
          contrastColor: "#ffffff",
          hoverColor: darkPrimary["400"],
        },
      },
    },
  },
});

export const embedThemeOptions = {
  prefix: "qrt",
  darkModeSelector: ".qirtaas-dark",
  cssLayer: {
    name: "primevue",
    order: "qirtaas-reset, theme, qirtaas, primevue",
  },
};

// PrimeVue plugin options for an embed mount. PrimeVue 4's theme is a single
// global `Theme` singleton, so when we SHARE the host's PrimeVue instance
// (externalized build) re-theming it with our own preset/prefix would wipe the
// host's design tokens (and, via the shared loaded-style registry, ours too) —
// that was the app-wide unstyle on editor mount. So in that mode we inherit the
// host's already-configured theme instead. When PrimeVue is bundled (no host
// instance) we own the theme and apply the Qirtaas brand preset.
export function embedPrimeVueOptions(): { theme: unknown } {
  if (typeof __QIRTAAS_HOST_PRIMEVUE__ !== "undefined" && __QIRTAAS_HOST_PRIMEVUE__) {
    // Re-pass the live host theme so the install's theme watcher is a
    // no-op-equivalent (re-injects identical tokens) rather than a clobber.
    return { theme: Theme.getTheme() };
  }
  return { theme: { preset: qirtaasPreset, options: embedThemeOptions } };
}
