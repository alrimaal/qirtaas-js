<script setup lang="ts">
import { ref, watch, provide, onMounted } from "vue";
import DocumentEditor from "../editor/DocumentEditor.vue";
import VerseDetailContainer from "../editor/VerseDetailContainer.vue";
import { IsDarkKey } from "../editor/runtime/context";
import Toast from "primevue/toast";
import type { ErrorCode, Json } from "../mount/types";

const props = withDefaults(
  defineProps<{
    /** Resolves the read-only document content (auth handled by the transport). */
    load: () => Promise<Json | null>;
    /** Forwarded to the editor so image reads carry `document_id` — required for
        the signature read path to authorize linked images. */
    documentId?: string;
    theme?: "light" | "dark";
    onReady?: () => void;
    onError?: (code: ErrorCode, detail?: unknown) => void;
  }>(),
  { theme: "light" }
);

const isDark = ref(props.theme === "dark");
watch(
  () => props.theme,
  (theme) => {
    isDark.value = theme === "dark";
  }
);
provide(IsDarkKey, isDark);

const content = ref<Json | null>(null);
const loading = ref(true);
const loadFailed = ref(false);

onMounted(async () => {
  try {
    content.value = await props.load();
  } catch (err) {
    loadFailed.value = true;
    props.onError?.("load_failed", err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="qirtaas-scope" :class="{ 'qirtaas-dark': isDark }">
    <div
      v-if="loading"
      style="
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 8rem;
      "
    >
      <i class="pi pi-spinner pi-spin" style="font-size: 1.5rem; opacity: 0.6" />
    </div>
    <DocumentEditor
      v-else-if="!loadFailed"
      :model-value="content"
      :editable="false"
      :document-id="documentId"
      @ready="onReady?.()"
    />
    <VerseDetailContainer overlay />
    <!-- PrimeVue 4.5.4 Toast ignores appendTo (always renders to body); scope it
         in place so host CSS can't leak in. -->
    <Toast :pt="{ root: { class: ['qirtaas-scope', { 'qirtaas-dark': isDark }] } }" />
  </div>
</template>
