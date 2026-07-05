<script setup lang="ts">
// Thin Vue adapter over @qirtaas/core's imperative mount() API: mount on insert,
// destroy on teardown, and forward the few live-updatable props to the editor's
// setters. Everything else is mount-time config. Vue is a peerDependency — this
// wrapper shares the host's Vue (core is bundled with Vue externalized).
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { createQirtaasClient } from "@qirtaas/core";
import type {
  EditorInstance,
  QirtaasClientOptions,
  Json,
  Locale,
  Theme,
  SaveState,
  ErrorCode,
} from "@qirtaas/core";

const props = defineProps<{
  apiUrl?: string;
  documentId?: string;
  initialContent?: Json | null;
  getToken: NonNullable<QirtaasClientOptions["getToken"]>;
  locale?: Locale;
  theme?: Theme;
  readOnly?: boolean;
  autofocus?: boolean;
  autosave?: EditorMountOptions["autosave"];
}>();

const emit = defineEmits<{
  ready: [];
  change: [json: Json];
  saveStateChange: [state: SaveState];
  documentCreated: [id: string];
  error: [code: ErrorCode, detail?: unknown];
  tokenExpired: [];
  event: [name: string, props?: Record<string, unknown>];
}>();

const host = ref<HTMLElement | null>(null);
let instance: EditorInstance | null = null;

onMounted(() => {
  if (!host.value) return;
  const client = createQirtaasClient({ apiUrl: props.apiUrl, getToken: props.getToken });
  instance = client.mountEditor(host.value, {
    documentId: props.documentId,
    initialContent: props.initialContent ?? null,
    locale: props.locale,
    theme: props.theme,
    readOnly: props.readOnly,
    autofocus: props.autofocus,
    autosave: props.autosave,
    onReady: () => emit("ready"),
    onChange: (json) => emit("change", json),
    onSaveStateChange: (state) => emit("saveStateChange", state),
    onDocumentCreated: (id) => emit("documentCreated", id),
    onError: (code, detail) => emit("error", code, detail),
    onTokenExpired: () => emit("tokenExpired"),
    onEvent: (name, eventProps) => emit("event", name, eventProps),
  });
});

// Only theme + editable change after mount; the rest require a remount.
watch(
  () => props.theme,
  (theme) => {
    if (theme) instance?.setTheme(theme);
  }
);
watch(
  () => props.readOnly,
  (readOnly) => instance?.setEditable(!readOnly)
);

onBeforeUnmount(() => {
  instance?.destroy();
  instance = null;
});

defineExpose({
  getJSON: () => instance?.getJSON() ?? null,
  save: () => instance?.save() ?? Promise.resolve(),
  setEditable: (editable: boolean) => instance?.setEditable(editable),
  setTheme: (theme: Theme) => instance?.setTheme(theme),
});
</script>

<template>
  <!-- The editor owns an internal scroll view (pinned toolbar, scrolling body),
       so it fills its container. The host must give this element a bounded
       height (e.g. a sized dialog body or `h-[60vh]`). -->
  <div ref="host" style="height: 100%"></div>
</template>
