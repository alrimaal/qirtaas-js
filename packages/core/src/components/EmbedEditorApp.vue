<script setup lang="ts">
import { ref, watch, provide, onMounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "primevue/usetoast";
import DocumentEditor from "../editor/DocumentEditor.vue";
import EditorToolbar from "../editor/EditorToolbar.vue";
import FindReplaceBar from "../editor/FindReplaceBar.vue";
import VerseDetailContainer from "../editor/VerseDetailContainer.vue";
import { IsDarkKey } from "../editor/runtime/context";
import Toast from "primevue/toast";
import {
  createDocument,
  getDocument,
  updateDocument,
} from "../services/documents";
import { QirtaasHttpError } from "../services/fetchChannel";
import { docIsEmpty } from "../editor/docUtils";
import { useDocumentAutosave } from "../composables/useDocumentAutosave";
import type { ErrorCode, Json, SaveState } from "../mount/types";

const props = withDefaults(
  defineProps<{
    documentId?: string;
    initialContent?: Json | null;
    editable?: boolean;
    autofocus?: boolean;
    theme?: "light" | "dark";
    autosaveEnabled?: boolean;
    autosaveDebounceMs?: number;
    onReady?: () => void;
    onChange?: (json: Json) => void;
    onSaveStateChange?: (state: SaveState) => void;
    onDocumentCreated?: (id: string) => void;
    onError?: (code: ErrorCode, detail?: unknown) => void;
  }>(),
  {
    editable: true,
    autofocus: false,
    theme: "light",
    autosaveEnabled: true,
    autosaveDebounceMs: 1500,
    initialContent: null,
  }
);

const { t } = useI18n();
const toast = useToast();

// Theme is host-owned; expose it to the editor via the inject seam.
const isDark = ref(props.theme === "dark");
watch(
  () => props.theme,
  (theme) => {
    isDark.value = theme === "dark";
  }
);
provide(IsDarkKey, isDark);

const editorRef = ref<InstanceType<typeof DocumentEditor> | null>(null);
const findReplaceVisible = ref(false);
const findReplaceRef = ref<InstanceType<typeof FindReplaceBar> | null>(null);
const content = ref<Json | null>(props.initialContent ?? null);

function openFindReplace() {
  if (findReplaceVisible.value) {
    nextTick(() => findReplaceRef.value?.focus());
  } else {
    findReplaceVisible.value = true;
  }
}

function closeFindReplace() {
  findReplaceVisible.value = false;
}
const loading = ref(false);
const loadFailed = ref(false);
// Editor renders only once we have content (or know there's none to load), so
// a documentId load doesn't flash an empty editor first.
const contentReady = ref(!props.documentId);

// The id we save against. Null until a documentId is provided or a doc is
// lazily created on first content. Reactive so the editor's document-id binding
// (used for image reads) picks up the lazily-created id.
const docId = ref<string | null>(props.documentId ?? null);
const toastedRejectedImageIds = new Set<string>();

function mapError(err: unknown): ErrorCode {
  if (err instanceof QirtaasHttpError) {
    const code = (err.body as { error?: string } | undefined)?.error;
    if (err.status === 413 || code === "document_too_large") {
      return "doc_too_large";
    }
    if (err.status === 401 || err.status === 403) return "unauthorized";
  }
  return "network";
}

// Persistence mechanics (debounce/dirty/save-state) live in the shared
// composable; this shell only supplies the embed's create-or-update behavior
// and toasts.
const autosave = useDocumentAutosave({
  enabled: props.autosaveEnabled,
  debounceMs: props.autosaveDebounceMs,
  getContent: () => content.value,
  // Don't create a document for an empty doc that doesn't exist yet.
  shouldPersist: (c) => !!docId.value || (c != null && !docIsEmpty(c)),
  persist: async (snapshot) => {
    if (!docId.value) {
      // Creation persists the snapshot itself; no follow-up PATCH needed.
      const doc = await createDocument(snapshot);
      docId.value = doc.id;
      props.onDocumentCreated?.(doc.id);
      return;
    }
    return await updateDocument(docId.value, snapshot);
  },
  onStateChange: (s) => props.onSaveStateChange?.(s),
  onRejectedImages: (rejected) => {
    const fresh = rejected.filter((id) => !toastedRejectedImageIds.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => toastedRejectedImageIds.add(id));
    toast.add({
      severity: "warn",
      summary: t("editor.image.rejectedTitle"),
      detail: t("editor.image.rejectedDetail"),
      life: 5000,
    });
  },
  onError: (err) => {
    const code = mapError(err);
    props.onError?.(code, err);
    toast.add({
      severity: "error",
      summary:
        code === "doc_too_large"
          ? t("errors.documentTooLarge")
          : t("errors.saveFailed"),
      life: 4000,
    });
  },
});

onMounted(async () => {
  if (!props.documentId) return;
  loading.value = true;
  autosave.setSuspended(true);
  try {
    const doc = await getDocument(props.documentId);
    content.value = doc.content;
  } catch (err) {
    loadFailed.value = true;
    props.onError?.("load_failed", err);
    toast.add({
      severity: "error",
      summary: t("errors.loadDocument"),
      life: 4000,
    });
  } finally {
    loading.value = false;
    contentReady.value = true;
    autosave.setSuspended(false);
  }
  // onReady fires once the editor is actually mounted (see editorRef watch).
});

watch(
  () => props.editable,
  (editable) => editorRef.value?.editor?.setEditable(editable)
);

function onContentUpdate(json: Json) {
  content.value = json;
  props.onChange?.(json);
  autosave.schedule();
}

defineExpose({
  getJSON: () => content.value,
  save: autosave.saveNow,
  setEditable: (editable: boolean) =>
    editorRef.value?.editor?.setEditable(editable),
});
</script>

<template>
  <div
    class="qirtaas-scope flex flex-col h-full min-h-0 min-w-0"
    :class="{ 'qirtaas-dark': isDark }"
  >
    <div
      v-if="loading"
      class="flex-1 flex items-center justify-center"
      style="min-height: 8rem"
    >
      <i class="pi pi-spinner pi-spin" style="font-size: 1.5rem; opacity: 0.6" />
    </div>
    <template v-else-if="contentReady">
      <!-- Desktop toolbar (top). Editing only; drives the editor through the
           DocumentEditor's exposed imperative API. -->
      <div
        v-if="editable && !loadFailed && editorRef?.editor"
        class="hidden md:block shrink-0 border-b border-border bg-bg px-3"
      >
        <EditorToolbar
          :editor="editorRef.editor"
          @open-quran="editorRef.openQuranDialog"
          @open-hadith="editorRef.openHadithDialog"
          @insert-table="editorRef.insertTable"
          @insert-image="(f) => editorRef?.insertImageFromInput(f)"
          @open-find-replace="openFindReplace"
        />
      </div>
      <FindReplaceBar
        v-if="findReplaceVisible && editorRef?.editor"
        ref="findReplaceRef"
        class="shrink-0"
        :editor="editorRef.editor"
        @close="closeFindReplace"
      />
      <!-- The SDK owns the scroll: toolbar(s) stay pinned while only the editor
           scrolls. `data-editor-scroll` is the seam the resizable-image NodeView
           looks up for its scroll container; it must stay positioned (relative)
           so Moveable's control box anchors and clips to the editor. -->
      <div class="flex-1 min-h-0 min-w-0 overflow-y-auto relative" data-editor-scroll>
        <DocumentEditor
          ref="editorRef"
          :model-value="content"
          :editable="editable && !loadFailed"
          :autofocus="autofocus"
          :document-id="docId ?? undefined"
          @update:model-value="onContentUpdate"
          @ready="onReady?.()"
        />
      </div>
      <!-- Mobile toolbar (bottom), mirroring the SPA's bottom bar. -->
      <div
        v-if="editable && !loadFailed && editorRef?.editor"
        class="md:hidden shrink-0 border-t border-border bg-bg px-1"
      >
        <EditorToolbar
          :editor="editorRef.editor"
          @open-quran="editorRef.openQuranDialog"
          @open-hadith="editorRef.openHadithDialog"
          @insert-table="editorRef.insertTable"
          @insert-image="(f) => editorRef?.insertImageFromInput(f)"
          @open-find-replace="openFindReplace"
        />
      </div>
    </template>
    <VerseDetailContainer overlay />
    <!-- PrimeVue 4.5.4's Toast ignores `appendTo` (it builds its Portal with no
         props → always renders to document.body), so we can't move it into the
         scoped overlay root. Instead stamp the scope (and theme) onto the toast
         root itself so our reset applies wherever it lands and host CSS can't
         leak in. -->
    <Toast :pt="{ root: { class: ['qirtaas-scope', { 'qirtaas-dark': isDark }] } }" />
  </div>
</template>
