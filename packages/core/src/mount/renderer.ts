// Boots a read-only renderer onto a host DOM node. Same Vue/PrimeVue/i18n setup
// as the editor, but no toolbar/autosave — it loads one document by the host's
// chosen auth source and renders it non-editable.
import { createApp, reactive, h } from "vue";
import { createI18n } from "vue-i18n";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import ConfirmationService from "primevue/confirmationservice";
import Tooltip from "primevue/tooltip";
import { embedPrimeVueOptions } from "../styles/primevuePreset";
import en from "../i18n/en";
import ar from "../i18n/ar";
import EmbedRendererApp from "../components/EmbedRendererApp.vue";
import { setTransport } from "../services/transport";
import { setTrackEvent } from "../editor/runtime/analytics";
import { createRendererTransport } from "../services/rendererTransport";
import { getDocument, getSharedDocument } from "../services/documents";
import {
  acquireOverlayTarget,
  releaseOverlayTarget,
  setOverlayDark,
} from "./overlay";
import type { Json, RendererMountOptions, RendererInstance } from "./types";

/**
 * Internal boot options: the public {@link RendererMountOptions} plus the
 * apiUrl the client resolves. Auth stays per-call (see RendererMountOptions).
 * Hosts go through `createQirtaasClient().mountRenderer`.
 */
export interface RendererBootOptions extends RendererMountOptions {
  apiUrl: string;
}

export function mountRenderer(
  el: Element | string,
  options: RendererBootOptions
): RendererInstance {
  const target = typeof el === "string" ? document.querySelector(el) : el;
  if (!target) {
    throw new Error(`Qirtaas: mount target not found: ${String(el)}`);
  }

  const sources = [
    options.getSignature && "getSignature",
    options.getToken && "getToken",
    options.shareToken && "shareToken",
  ].filter(Boolean);
  if (sources.length !== 1) {
    throw new Error(
      "Qirtaas renderer requires exactly one auth source: getSignature, getToken, or shareToken."
    );
  }
  if (!options.shareToken && !options.documentId) {
    throw new Error("Qirtaas renderer requires a documentId.");
  }

  setTransport(
    createRendererTransport({
      apiUrl: options.apiUrl,
      getToken: options.getToken,
      getSignature: options.getSignature,
    })
  );
  setTrackEvent(() => {});

  const liveState = reactive({ theme: options.theme ?? "light" });

  acquireOverlayTarget();
  setOverlayDark(liveState.theme === "dark");

  // Share token → public /shared/<token>/ path; otherwise read by id with the
  // bearer/signature the transport attaches.
  const load = async (): Promise<Json | null> => {
    if (options.shareToken) {
      const doc = await getSharedDocument(options.shareToken);
      return doc.content;
    }
    const doc = await getDocument(options.documentId!);
    return doc.content;
  };

  const app = createApp({
    render: () =>
      h(EmbedRendererApp, {
        load,
        // Lets image reads send `document_id` so the signature path can authorize
        // them. Undefined in share-token mode, where `is_shared` authorizes instead.
        documentId: options.documentId,
        theme: liveState.theme,
        onReady: options.onReady,
        onError: options.onError,
      }),
  });
  app.use(
    createI18n({
      legacy: false,
      locale: options.locale ?? "en",
      fallbackLocale: "en",
      messages: { en, ar },
    })
  );
  app.use(PrimeVue, embedPrimeVueOptions());
  app.use(ToastService);
  app.use(ConfirmationService);
  // The verse/hadith detail panels reuse `v-tooltip`; register it like the SPA.
  app.directive("tooltip", Tooltip);
  app.mount(target);

  return {
    setTheme: (theme) => {
      liveState.theme = theme;
      setOverlayDark(theme === "dark");
    },
    destroy: () => {
      app.unmount();
      releaseOverlayTarget();
    },
  };
}
