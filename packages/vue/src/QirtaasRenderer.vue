<script setup lang="ts">
// Read-only sibling of QirtaasEditor: mounts @qirtaas/core's renderer and only
// tracks live theme changes. Exactly one auth source (getSignature | getToken |
// shareToken) must be supplied — the core mount() enforces that.
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { createQirtaasClient } from "@qirtaas/core";
import type {
  RendererInstance,
  RendererMountOptions,
  Locale,
  Theme,
  ErrorCode,
} from "@qirtaas/core";

const props = defineProps<{
  apiUrl?: string;
  documentId?: string;
  locale?: Locale;
  theme?: Theme;
  getSignature?: RendererMountOptions["getSignature"];
  getToken?: RendererMountOptions["getToken"];
  shareToken?: string;
}>();

const emit = defineEmits<{
  ready: [];
  error: [code: ErrorCode, detail?: unknown];
}>();

const host = ref<HTMLElement | null>(null);
let instance: RendererInstance | null = null;

onMounted(() => {
  if (!host.value) return;
  // Renderer auth is per-call (getSignature/getToken/shareToken); the client
  // only carries apiUrl, so no getToken is configured here.
  const client = createQirtaasClient({ apiUrl: props.apiUrl });
  instance = client.mountRenderer(host.value, {
    documentId: props.documentId,
    locale: props.locale,
    theme: props.theme,
    getSignature: props.getSignature,
    getToken: props.getToken,
    shareToken: props.shareToken,
    onReady: () => emit("ready"),
    onError: (code, detail) => emit("error", code, detail),
  });
});

watch(
  () => props.theme,
  (theme) => {
    if (theme) instance?.setTheme(theme);
  }
);

onBeforeUnmount(() => {
  instance?.destroy();
  instance = null;
});

defineExpose({
  setTheme: (theme: Theme) => instance?.setTheme(theme),
});
</script>

<template>
  <div ref="host"></div>
</template>
