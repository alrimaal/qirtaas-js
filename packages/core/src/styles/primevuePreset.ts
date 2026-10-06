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

// Paper (light) / Night (dark) palettes; mirror the tokens in main.css + embed.css.
const primary = palette("#5d1d3d") as Record<string, string>;

const paperSurface = {
  0: "#fffdf9",
  50: "#fcf9f4",
  100: "#f4eee5",
  200: "#e7ddd0",
  300: "#d6c9ba",
  400: "#b3a39a",
  500: "#8e7e7f",
  600: "#6f6064",
  700: "#55474b",
  800: "#3d3034",
  900: "#2b1e23",
  950: "#1d1418",
};

const nightSurface = {
  0: "#ffffff",
  50: "#f2e8db",
  100: "#e3d6cb",
  200: "#cbbcb6",
  300: "#b6a6aa",
  400: "#968689",
  500: "#77686c",
  600: "#5a4b51",
  700: "#3e2f36",
  800: "#271b21",
  900: "#1d1418",
  950: "#170f13",
};

export const qirtaasPreset = definePreset(Aura, {
  semantic: {
    primary,
    colorScheme: {
      light: {
        surface: paperSurface,
        primary: {
          color: "#5d1d3d",
          contrastColor: "#fbf3ec",
          hoverColor: "#4a1731",
          activeColor: "#410322",
        },
      },
      dark: {
        surface: nightSurface,
        primary: {
          color: "#edc5d9",
          contrastColor: "#3a0d22",
          hoverColor: "#f5dbe8",
          activeColor: "#e0aec7",
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
