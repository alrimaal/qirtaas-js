import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { CORE_SRC, scopedCssPlugins } from "../core/vite.shared";

// @qirtaas/react bundles core's editor from source WITH Vue (a React host has no
// Vue to lend), and externalizes only react/react-dom as peers. The wrapper
// itself uses no JSX (createElement), so no React/JSX build plugin is needed —
// @vitejs/plugin-vue is here solely to compile core's .vue components.
export default defineConfig({
  resolve: {
    alias: {
      "@qirtaas/core": CORE_SRC,
    },
  },
  css: {
    postcss: { plugins: scopedCssPlugins() },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    // A React host has no PrimeVue to share, so the embed bundles + themes its
    // own instance.
    __QIRTAAS_HOST_PRIMEVUE__: "false",
  },
  build: {
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      formats: ["es"],
      fileName: () => "qirtaas-react.js",
    },
    rollupOptions: {
      external: ["react", "react-dom"],
      output: {
        assetFileNames: (info) =>
          info.name?.endsWith(".css") ? "qirtaas.css" : "assets/[name][extname]",
      },
    },
  },
  plugins: [vue()],
});
