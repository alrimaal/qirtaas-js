<script setup lang="ts">
// Read-only document view: the document's nodes and node views only. No
// editing extensions, dialogs, bubble menus or window listeners, so it's cheap
// to mount many times (thumbnails, previews, shared links, the SDK renderer).
import { ref, shallowRef, watch } from "vue";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import { NodeSelection } from "@tiptap/pm/state";
import {
  TableOfContents,
  type TableOfContentData,
} from "@tiptap/extension-table-of-contents";
import { useI18n } from "vue-i18n";
import { documentExtensions } from "./extensions/schema";
import { useAtomDetail } from "./useAtomDetail";
import "./document.css";

const props = withDefaults(
  defineProps<{
    content: Record<string, unknown> | null;
    documentId?: string;
    /** Size to content, for small previews. */
    compact?: boolean;
    /** Track headings for the document outline. */
    outline?: boolean;
  }>(),
  { documentId: undefined, compact: false, outline: false }
);

const emit = defineEmits<{ ready: [] }>();

const { t } = useI18n();
const openAtomDetail = useAtomDetail();
const failedToLoad = ref(false);
const outlineItems = shallowRef<TableOfContentData>([]);

const editor = useEditor({
  // An empty document arrives as {}, which fails the content check.
  content: props.content?.type ? props.content : undefined,
  editable: false,
  enableContentCheck: true,
  onContentError({ error }) {
    console.error(error);
    failedToLoad.value = true;
  },
  extensions: [
    ...documentExtensions({
      documentId: props.documentId,
      translate: (key: string) => t(key),
    }),
    ...(props.outline
      ? [
          TableOfContents.configure({
            scrollParent: () =>
              document.querySelector<HTMLElement>("[data-editor-scroll]") ??
              window,
            onUpdate: (items) => {
              outlineItems.value = items;
            },
          }),
        ]
      : []),
  ],
  editorProps: {
    attributes: {
      class: props.compact
        ? "outline-none px-1 pt-4 pb-10"
        : "outline-none min-h-[70vh] px-1 py-4",
    },
  },
  onCreate: () => emit("ready"),
  // Tapping a verse, hadith or mushaf page opens its study panel.
  onSelectionUpdate: ({ editor: ed }) => {
    const { selection } = ed.state;
    if (selection instanceof NodeSelection) {
      openAtomDetail(selection.node.type.name, selection.node.attrs);
    }
  },
});

watch(
  () => props.content,
  (content) => {
    if (content?.type) {
      editor.value?.commands.setContent(content, { emitUpdate: false });
    }
  }
);

defineExpose({ editor, outlineItems });
</script>

<template>
  <p v-if="failedToLoad" class="py-10 text-center text-muted">
    {{ t("editor.failedToLoad") }}
  </p>
  <EditorContent v-else :editor="editor" class="flex-1 px-3" />
</template>
