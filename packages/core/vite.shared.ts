// Shared build pieces for @qirtaas/core and the framework wrappers. Each wrapper
// bundles core's editor from source and re-runs this exact CSS pass, so the
// scoping (and the woff2 trim) can't drift between packages.
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/postcss";
import prefixSelector from "postcss-prefix-selector";
import type { Plugin as PostcssPlugin, AcceptedPlugin } from "postcss";

// The scope class every Qirtaas mount container + overlay root carries. The
// prefix-selector pass rewrites the built stylesheet so *nothing* applies
// outside this subtree — Tailwind utilities, the reset, component styles — so
// the SDK can never restyle the host page (host CSS bleed is handled separately
// by `@layer qirtaas` + the scoped reset in embed.css).
export const SCOPE = ".qirtaas-scope";

// Absolute path to core's source. Wrappers alias `@qirtaas/core` (and its
// self-referential subpath imports) here so they bundle the editor from source.
// Resolved relative to THIS file, which lives in packages/core, so it's correct
// no matter which package imports it.
export const CORE_SRC = fileURLToPath(new URL("./src", import.meta.url));

// Selectors that are already scope-anchored (or are keyframe steps) must be left
// alone — prefixing them would either double the scope class or break the rule.
const ALREADY_SCOPED = /\.qirtaas-(scope|overlay-root|dark)\b/;
const KEYFRAME_STEP = /^(?:\d+%|from|to)$/;
// Host-level selectors collapse onto the scope root itself: the embed has no
// real <html>/<body>, so their rules belong on the mount container.
const ROOT_LEVEL = new Set([":root", ":host", "html", "body"]);

function scopeTransform(
  _prefix: string,
  selector: string,
  prefixedSelector: string
): string {
  const trimmed = selector.trim();
  if (ALREADY_SCOPED.test(trimmed)) return selector;
  if (KEYFRAME_STEP.test(trimmed)) return selector;
  if (ROOT_LEVEL.has(trimmed)) return SCOPE;
  return prefixedSelector;
}

// Vite library mode force-inlines assets (the assetsInlineLimit is ignored), so
// PrimeIcons' font is base64'd into the stylesheet whether we want it or not.
// Its one @font-face lists eot/woff2/woff/ttf/svg; inlining all five (the svg
// alone is ~280KB) makes the CSS ~10x larger for formats no supported browser
// fetches. Drop the non-woff2 sources before Vite inlines them.
const woff2Only: PostcssPlugin = {
  postcssPlugin: "qirtaas:woff2-only",
  AtRule: {
    "font-face"(atRule) {
      // Only prune faces that actually have a woff2 (PrimeIcons); woff2-only
      // faces (e.g. the QPC Quran font) are left untouched.
      let hasWoff2 = false;
      atRule.walkDecls("src", (decl) => {
        if (/woff2/i.test(decl.value)) hasWoff2 = true;
      });
      if (!hasWoff2) return;
      atRule.walkDecls("src", (decl) => {
        // PrimeIcons emits a lone `src: url(...eot)` IE9 fallback plus a
        // multi-format list; drop the former, trim the latter to woff2.
        if (!/woff2/i.test(decl.value)) {
          decl.remove();
          return;
        }
        const sources = decl.value.split(/,(?![^()]*\))/).map((s) => s.trim());
        decl.value = sources.filter((s) => /woff2/i.test(s)).join(", ");
      });
    },
  },
};

/** PostCSS chain that expands Tailwind then scopes every selector under .qirtaas-scope. */
export function scopedCssPlugins(): AcceptedPlugin[] {
  return [
    woff2Only,
    tailwindcss(),
    prefixSelector({ prefix: SCOPE, transform: scopeTransform }),
  ];
}
