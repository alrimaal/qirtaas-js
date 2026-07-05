import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";
import { CORE_SRC, scopedCssPlugins } from "../core/vite.shared";

// @qirtaas/vue is a self-contained artifact: it bundles core's editor from
// source (so there's no @qirtaas/core runtime dependency to resolve) and
// externalizes ONLY `vue`, which the host supplies as a peer — so the editor
// shares the host's single Vue instance (no double-bundle, shared reactivity).
export default defineConfig({
  resolve: {
    // Core (and its self-referential `@qirtaas/core/...` subpath imports) resolve
    // to source so the whole editor is bundled in.
    alias: {
      "@qirtaas/core": CORE_SRC,
    },
  },
  css: {
    // Identical scoping pass to core (shared module) so styles can't drift.
    postcss: { plugins: scopedCssPlugins() },
  },
  // Bake production into the bundled deps (tiptap/…); `vue` and PrimeVue stay
  // external. PrimeVue 4's theme is a single global singleton, so a SECOND
  // bundled copy fights the host's over the shared <head> styles (app-wide
  // unstyle on mount). Externalizing it makes the embed share the host's one
  // PrimeVue instance; __QIRTAAS_HOST_PRIMEVUE__ then tells the embed to inherit
  // the host's theme rather than re-theming the shared singleton.
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    __QIRTAAS_HOST_PRIMEVUE__: "true",
  },
  build: {
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      formats: ["es"],
      fileName: () => "qirtaas-vue.js",
    },
    rollupOptions: {
      // PrimeVue + its @primeuix/* deps resolve to the host's copies (a single
      // shared instance); only `vue` was external before.
      external: ["vue", /^primevue/, /^@primeuix\//],
      output: {
        assetFileNames: (info) =>
          info.name?.endsWith(".css") ? "qirtaas.css" : "assets/[name][extname]",
      },
    },
  },
  plugins: [
    vue(),
    // Emit declarations. The runtime alias bundles core from source, but for
    // TYPES we want the re-exports to stay `from "@qirtaas/core"` (a declared
    // dependency resolving to core's own .d.ts) — so exclude it from the alias
    // rewrite the dts plugin would otherwise apply.
    dts({
      tsconfigPath: "./tsconfig.json",
      aliasesExclude: [/^@qirtaas\/core/],
    }),
  ],
});
