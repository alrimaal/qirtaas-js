import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";
import { CORE_SRC, scopedCssPlugins } from "./vite.shared";

export default defineConfig({
  resolve: {
    // Core's source refers to itself as `@qirtaas/core/...`; map that to src so
    // the bundle resolves its own modules.
    alias: {
      "@qirtaas/core": CORE_SRC,
    },
  },
  css: {
    // Expand Tailwind utilities, then scope every selector under .qirtaas-scope.
    postcss: { plugins: scopedCssPlugins() },
  },
  // The UMD/CDN bundle runs directly in a browser with no host bundler to
  // substitute Node globals, so bake in production Vue/PrimeVue — otherwise
  // `process.env.NODE_ENV` lookups throw "process is not defined".
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    // Core's UMD/CDN bundle ships its own PrimeVue (no host to share), so the
    // embed themes its own instance.
    __QIRTAAS_HOST_PRIMEVUE__: "false",
  },
  build: {
    emptyOutDir: true,
    // One stylesheet for the whole library. Consumers load it themselves —
    // ESM: `import "@qirtaas/core/qirtaas.css"`; script tag: a <link>.
    cssCodeSplit: false,
    lib: {
      entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      name: "Qirtaas",
      formats: ["es", "umd"],
      fileName: (format) => (format === "es" ? "qirtaas.js" : "qirtaas.umd.js"),
    },
    rollupOptions: {
      output: {
        // Stable, unhashed CSS filename for the documented export path; fonts and
        // other assets land in assets/ next to it.
        assetFileNames: (info) =>
          info.name?.endsWith(".css") ? "qirtaas.css" : "assets/[name][extname]",
      },
    },
  },
  plugins: [
    vue(),
    // Emit declarations. The public entry (index → mount/*) is self-contained,
    // so the shipped types need no third-party (TipTap/PrimeVue) declarations.
    dts({ tsconfigPath: "./tsconfig.json" }),
  ],
});
