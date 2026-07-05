// Shared overlay root: a single Qirtaas-scoped, body-level container that the
// editor's popovers/menus render into, so they escape the host's clipping and
// stacking contexts (overflow:hidden, transforms, z-index) while still getting
// Qirtaas styles + theme. Refcounted so concurrent mounts share one root.
//
// getOverlayTarget() falls back to document.body when no root has been acquired
// — that's the SPA case, which never creates a root, so SPA behavior is
// unchanged (tippy etc. keep appending to body as before).
let overlayRoot: HTMLElement | null = null;
let refCount = 0;

export function acquireOverlayTarget(): HTMLElement {
  if (!overlayRoot) {
    overlayRoot = document.createElement("div");
    overlayRoot.className = "qirtaas-scope qirtaas-overlay-root";
    document.body.appendChild(overlayRoot);
  }
  refCount += 1;
  return overlayRoot;
}

export function releaseOverlayTarget(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && overlayRoot) {
    overlayRoot.remove();
    overlayRoot = null;
  }
}

/** appendTo target for tippy: scoped root in embeds, body in the SPA (tippy's natural default). */
export function getOverlayTarget(): HTMLElement {
  return overlayRoot ?? document.body;
}

/**
 * appendTo for PrimeVue overlays: the scoped root in embeds, or `undefined` in
 * the SPA so PrimeVue keeps its own default (no SPA behavior change).
 */
export function getOverlayAppendTo(): HTMLElement | undefined {
  return overlayRoot ?? undefined;
}

export function setOverlayDark(dark: boolean): void {
  overlayRoot?.classList.toggle("qirtaas-dark", dark);
}
