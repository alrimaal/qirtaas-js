// Boots the Vue editor onto a host DOM node and returns an imperative handle.
// Framework wrappers (@qirtaas/react, @qirtaas/vue) and plain JS all call this.
import { createApp, reactive, h, ref } from "vue";
import { createI18n } from "vue-i18n";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import ConfirmationService from "primevue/confirmationservice";
import Tooltip from "primevue/tooltip";
import { embedPrimeVueOptions } from "../styles/primevuePreset";
import en from "../i18n/en";
import ar from "../i18n/ar";
import EmbedEditorApp from "../components/EmbedEditorApp.vue";
import { setTransport } from "../services/transport";
import { setTrackEvent } from "../editor/runtime/analytics";
import { createEmbedTransport } from "../services/embedTransport";
import {
  acquireOverlayTarget,
  releaseOverlayTarget,
  setOverlayDark,
} from "./overlay";
import type { EditorMountOptions, EditorInstance, Json } from "./types";

interface EmbedAppExposed {
  getJSON(): Json | null;
  save(): Promise<void>;
  setEditable(editable: boolean): void;
}

/**
 * Internal boot options: the public {@link EditorMountOptions} plus the
 * connection/auth the client resolves once (apiUrl + getToken). Hosts never
 * call this directly — they go through `createQirtaasClient().mountEditor`.
 */
export interface EditorBootOptions extends EditorMountOptions {
  apiUrl: string;
  getToken: () => Promise<string> | string;
}

export function mountEditor(
  el: Element | string,
  options: EditorBootOptions
): EditorInstance {
  const target = typeof el === "string" ? document.querySelector(el) : el;
  if (!target) {
    throw new Error(`Qirtaas: mount target not found: ${String(el)}`);
  }

  // NOTE: transport/analytics are module singletons — correct for one editor
  // per page (the SDK's supported shape). True multi-embed isolation needs
  // per-instance injection, which would have to thread through the TipTap
  // extensions (QuranMushaf/ImageNode) that read the transport with no Vue
  // inject access — a deliberately out-of-scope, separate refactor.
  setTransport(
    createEmbedTransport({
      apiUrl: options.apiUrl,
      getToken: options.getToken,
      onTokenExpired: options.onTokenExpired,
    })
  );
  setTrackEvent(options.onEvent ?? (() => {}));

  // theme + editable change after mount, so they're the reactive root state.
  // Everything else is static mount config — changing it means re-mounting.
  const liveState = reactive({
    theme: options.theme ?? "light",
    editable: !options.readOnly,
  });

  // Scoped overlay root for dialogs/menus; theme-synced (see setTheme below).
  acquireOverlayTarget();
  setOverlayDark(liveState.theme === "dark");

  // Ref to the app's exposed imperative API (getJSON/save/setEditable).
  const appApi = ref<EmbedAppExposed | null>(null);

  // A render-function root reads liveState reactively, so setTheme/setEditable
  // re-render the editor — unlike root props passed to createApp, which Vue
  // copies by value at mount.
  const app = createApp({
    render: () =>
      h(EmbedEditorApp, {
        ref: appApi,
        documentId: options.documentId,
        initialContent: options.initialContent ?? null,
        editable: liveState.editable,
        theme: liveState.theme,
        autofocus: options.autofocus ?? false,
        autosaveEnabled: options.autosave?.enabled ?? true,
        autosaveDebounceMs: options.autosave?.debounceMs ?? 1500,
        onReady: options.onReady,
        onChange: options.onChange,
        onSaveStateChange: options.onSaveStateChange,
        onDocumentCreated: options.onDocumentCreated,
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
  // `v-tooltip` is used across the editor's bubble menus/toolbar; the SPA
  // registers it globally, so the embed app must too or Vue warns and tooltips
  // silently no-op.
  app.directive("tooltip", Tooltip);
  app.mount(target);

  return {
    getJSON: () => appApi.value?.getJSON() ?? null,
    save: () => appApi.value?.save() ?? Promise.resolve(),
    setEditable: (editable) => {
      liveState.editable = editable;
    },
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
