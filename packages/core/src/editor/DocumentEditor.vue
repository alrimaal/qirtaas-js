<script setup lang="ts">
import { ref, computed } from "vue";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { SearchReplace } from "./extensions/SearchReplace";
import StarterKit from "@tiptap/starter-kit";
import Emoji, { gitHubEmojis } from "@tiptap/extension-emoji";
import { emojiSuggestion } from "./emojiSuggestion";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import {
  Table,
  TableRow,
  TableHeader,
  TableCell,
} from "@tiptap/extension-table";
import TableBubbleMenu from "./TableBubbleMenu.vue";
import AtomBubbleMenu from "./AtomBubbleMenu.vue";
import Button from "primevue/button";
import {
  Details,
  DetailsSummary,
  DetailsContent,
} from "@tiptap/extension-details";
import { QuranVerse } from "./extensions/QuranVerse";
import { QuranMushaf } from "./extensions/QuranMushaf";
import { HadithNode } from "./extensions/HadithNode";
import { SlashCommand } from "./extensions/SlashCommand";
import { Honorific } from "./extensions/Honorific";
import { ImageNode } from "./extensions/ImageNode";
import { FileHandler } from "@tiptap/extension-file-handler";
import QuranSearchDialog from "./QuranSearchDialog.vue";
import HadithSearchDialog from "./HadithSearchDialog.vue";
import ImageUploadDialog from "./ImageUploadDialog.vue";
import { MAX_IMAGE_BYTES } from "@qirtaas/core/services/images";
import { useI18n } from "vue-i18n";
import TextDirection from "tiptap-text-direction";
import { trackEvent } from "./runtime/analytics";
import { useVerseDetail } from "@qirtaas/core/composables/useVerseDetail";
import { useHadithDetail } from "@qirtaas/core/composables/useHadithDetail";
import { useIsMobile } from "@qirtaas/core/composables/useIsMobile";
import { useToast } from "primevue/usetoast";

const verseDetail = useVerseDetail();
const hadithDetail = useHadithDetail();
const toast = useToast();
const { isMobile } = useIsMobile();

const props = withDefaults(
  defineProps<{
    modelValue: Record<string, unknown> | null;
    editable?: boolean;
    autofocus?: boolean;
    documentId?: string;
  }>(),
  { editable: true, autofocus: false, documentId: undefined }
);

const emit = defineEmits<{
  "update:modelValue": [value: Record<string, unknown>];
  /** Fired once the TipTap instance is created and usable. */
  ready: [];
}>();

const { t, locale } = useI18n();

const quranDialogVisible = ref(false);
const hadithDialogVisible = ref(false);
const failedToLoad = ref(false);

const pendingImageFile = ref<File | null>(null);
let pendingImagePos: number | null = null;

const imageAlignments = computed(() => {
  const items = [
    { value: "left" as const, icon: "pi pi-align-left" },
    { value: "center" as const, icon: "pi pi-align-center" },
    { value: "right" as const, icon: "pi pi-align-right" },
  ];
  return locale.value === "ar" ? [...items].reverse() : items;
});

function setImageAlign(value: "left" | "center" | "right") {
  editor.value
    ?.chain()
    .focus()
    .updateAttributes("imageNode", { align: value })
    .run();
}

function setMushafAlign(value: "left" | "center" | "right") {
  editor.value
    ?.chain()
    .focus()
    .updateAttributes("quranMushaf", { align: value })
    .run();
}

const ALLOWED_IMAGE_MIMES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

function selectFirstImage(files: File[]): File | null {
  const images = files.filter((f) => f.type.startsWith("image/"));
  if (images.length === 0) return null;
  if (images.length > 1) {
    toast.add({
      severity: "info",
      summary: t("editor.image.singleOnly"),
      life: 3500,
    });
  }
  const file = images[0]!;
  if (file.size > MAX_IMAGE_BYTES) {
    toast.add({
      severity: "error",
      summary: t("editor.image.tooLarge"),
      life: 4000,
    });
    return null;
  }
  return file;
}

function startImageUpload(file: File, pos: number | null) {
  pendingImagePos = pos;
  pendingImageFile.value = file;
  trackEvent("image_upload_started");
}

function onImageUploaded(imageId: string) {
  const ed = editor.value;
  pendingImageFile.value = null;
  if (!ed) return;
  const node = { type: "imageNode", attrs: { imageId, alt: "" } };
  if (pendingImagePos !== null) {
    const docSize = ed.state.doc.content.size;
    const pos = Math.min(Math.max(pendingImagePos, 0), docSize);
    ed.chain().focus().insertContentAt(pos, node).run();
  } else {
    ed.chain().focus().insertContent(node).run();
  }
  pendingImagePos = null;
  trackEvent("image_inserted");
}

function onImageUploadCancelled() {
  pendingImageFile.value = null;
  pendingImagePos = null;
}

function insertImageFromInput(file: File) {
  const picked = selectFirstImage([file]);
  if (!picked) return;
  const ed = editor.value;
  const pos = ed ? ed.state.selection.from : null;
  startImageUpload(picked, pos);
}

const editor = useEditor({
  content: props.modelValue?.type ? props.modelValue : undefined, // Empty document gets empty object which breaks validity checks
  enableContentCheck: true,
  onContentError({ error }) {
    console.error(error);
    toast.add({
      severity: "error",
      summary: t("editor.failedToLoad"),
      life: 4000,
    });
    failedToLoad.value = true;
  },
  extensions: [
    StarterKit.configure({}),
    TextDirection.configure({
      types: ["heading", "paragraph", "listItem", "bulletItem"],
    }),
    Emoji.configure({
      emojis: gitHubEmojis,
      enableEmoticons: true,
      suggestion: emojiSuggestion,
    }),
    Placeholder.configure({
      placeholder: ({ editor: ed, pos }) => {
        if (ed.state.doc.childCount === 1) return t("editor.placeholder");
        return t("editor.slashHint");
      },
      showOnlyCurrent: true,
    }),
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    Highlight.configure({
      multicolor: true,
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        rel: "noopener noreferrer",
        target: "_blank",
      },
    }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Details.configure({
      persist: true,
      HTMLAttributes: { dir: "auto" },
    }),
    DetailsSummary,
    DetailsContent,
    QuranVerse,
    QuranMushaf,
    HadithNode,
    Honorific,
    ImageNode.configure({
      documentId: props.documentId,
      translate: (key: string) => t(key),
    }),
    FileHandler.configure({
      allowedMimeTypes: ALLOWED_IMAGE_MIMES,
      onDrop: (_editor, files, pos) => {
        const picked = selectFirstImage(files);
        if (picked) startImageUpload(picked, pos);
      },
      onPaste: (currentEditor, files) => {
        const picked = selectFirstImage(files);
        if (picked) {
          startImageUpload(picked, currentEditor.state.selection.from);
        }
      },
    }),
    SearchReplace.configure({
      searchResultClass: "search-result",
    }),
    SlashCommand.configure({
      locale: locale.value,
      onCommand: (commandId: string, editor: import("@tiptap/core").Editor) => {
        trackEvent("slash_command", { command: commandId });
        if (commandId === "quran") {
          quranDialogVisible.value = true;
        } else if (commandId === "hadith") {
          hadithDialogVisible.value = true;
        } else if (commandId === "jj" || commandId === "saw") {
          editor
            ?.chain()
            .focus()
            .insertContent({ type: "honorific", attrs: { type: commandId } })
            .run();
        }
      },
    }),
  ],
  editable: props.editable,
  editorProps: {
    attributes: {
      class: `outline-none min-h-[70vh] px-1 py-4${
        props.editable ? " pb-[33vh]" : ""
      }`,
    },
  },
  autofocus: props.autofocus ? "end" : false,
  onCreate: () => {
    emit("ready");
  },
  onUpdate: ({ editor: ed }) => {
    emit("update:modelValue", ed.getJSON() as Record<string, unknown>);
  },
  onSelectionUpdate: ({ editor: ed }) => {
    // On mobile, the AtomBubbleMenu handles this when editable.
    // When not editable, fall through so tap-select opens the panel directly.
    if (isMobile.value && props.editable) return;
    const { selection } = ed.state;
    if (!(selection instanceof NodeSelection)) return;
    const nodeType = selection.node.type.name;
    if (
      nodeType !== "quranVerse" &&
      nodeType !== "hadithNode" &&
      nodeType !== "quranMushaf"
    )
      return;
    // quranMushaf uses an image-style bubble menu when editable; only
    // fall through to auto-open in readonly mode.
    if (nodeType === "quranMushaf" && props.editable) return;
    const attrs = selection.node.attrs;
    const pos = selection.$from.pos + selection.node.nodeSize;
    onAtomAction(nodeType, attrs);
  },
});

defineExpose({
  editor,
  openQuranDialog,
  openHadithDialog,
  insertTable,
  insertImageFromInput,
});

function onAtomAction(nodeType: string, attrs: Record<string, unknown>) {
  if (nodeType === "quranVerse") {
    const surah = attrs.surah as number;
    const fromAyah = (attrs.fromAyah as number | null) ?? (attrs.ayah as number);
    verseDetail.open(surah, fromAyah, locale.value);
  } else if (nodeType === "hadithNode") {
    hadithDetail.open(
      attrs.collectionNameEnglish as string,
      attrs.number as number
    );
  } else if (nodeType === "quranMushaf") {
    const from = attrs.from as { surah: number; ayah: number } | null;
    if (!from) return;
    verseDetail.open(from.surah, from.ayah, locale.value);
  }
}

function insertTable() {
  if (editor.value?.isActive("table")) return;
  editor.value
    ?.chain()
    .focus()
    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
    .run();
  trackEvent("table_inserted");
}

function openQuranDialog() {
  quranDialogVisible.value = true;
}

function openHadithDialog() {
  hadithDialogVisible.value = true;
}

function insertHadith(data: {
  collectionNameArabic: string;
  collectionNameEnglish: string;
  number: number | null;
  text: string;
}) {
  editor.value
    ?.chain()
    .focus()
    .insertContent({
      type: "hadithNode",
      attrs: data,
    })
    .run();
  trackEvent("hadith_inserted", { collection: data.collectionNameEnglish });
}

function insertQuranVerse(data: {
  surah: number;
  ayah: number;
  fromAyah: number | null;
  toAyah: number | null;
  fromWord: number | null;
  toWord: number | null;
  surahNameArabic: string;
  surahNameEnglish: string;
  text: string;
}) {
  editor.value
    ?.chain()
    .focus()
    .insertContent({
      type: "quranVerse",
      attrs: { ...data, encoding: "qpc_hafs" },
    })
    .run();
  trackEvent("quran_inserted", {
    surah: data.surah,
    ayah: data.ayah,
    range: data.fromAyah != null && data.toAyah != null && data.fromAyah !== data.toAyah
      ? `${data.fromAyah}-${data.toAyah}`
      : undefined,
  });
  if (verseDetail.isOpen.value) {
    verseDetail.open(data.surah, data.fromAyah ?? data.ayah, locale.value);
  }
}

function insertQuranMushaf(data: {
  page: number;
  lineStart: number;
  lineEnd: number;
  from: { surah: number; ayah: number; word: number };
  to: { surah: number; ayah: number; word: number };
  width: number;
  height: number;
}) {
  editor.value
    ?.chain()
    .focus()
    .insertContent({
      type: "quranMushaf",
      attrs: {
        page: data.page,
        lineStart: data.lineStart,
        lineEnd: data.lineEnd,
        from: data.from,
        to: data.to,
        width: data.width,
        height: data.height,
        align: "center",
      },
    })
    .run();
  trackEvent("quran_mushaf_inserted", {
    page: data.page,
    surah: data.from.surah,
    fromAyah: data.from.ayah,
    toAyah: data.to.ayah,
  });
}
</script>

<template>
  <div class="flex flex-col flex-1">
    <div
      v-if="failedToLoad"
      class="flex flex-col items-center justify-center flex-1 gap-4 text-center px-6 py-20"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-muted opacity-40"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
      <div class="flex flex-col gap-1">
        <p class="text-ink text-lg font-semibold">
          {{ t("editor.failedToLoad") }}
        </p>
        <p class="text-muted text-sm">{{ t("editor.tryAgainLater") }}</p>
      </div>
    </div>
    <template v-else>
      <TableBubbleMenu v-if="editor && editable" :editor="editor" />
      <AtomBubbleMenu
        v-if="editor && editable"
        :hidden="!isMobile"
        :editor="editor"
        :node-types="['quranVerse', 'hadithNode']"
        @action="onAtomAction"
      >
        <template #action="{ attrs, onAction }">
          <Button
            v-if="editor!.isActive('quranVerse')"
            severity="secondary"
            text
            rounded
            size="small"
            :label="t('editor.verse.viewTafsir')"
            @click="onAction"
          >
            <template #icon>
              <i class="pi pi-book text-xs" />
            </template>
          </Button>
          <Button
            v-if="editor!.isActive('hadithNode')"
            severity="secondary"
            text
            rounded
            size="small"
            :label="t('editor.hadith.viewDetails')"
            @click="onAction"
          >
            <template #icon>
              <i class="pi pi-book text-xs" />
            </template>
          </Button>
        </template>
      </AtomBubbleMenu>
      <AtomBubbleMenu
        v-if="editor && editable"
        :editor="editor"
        :node-types="['imageNode', 'quranMushaf']"
        @action="onAtomAction"
      >
        <template #action="{ onAction }">
          <Button
            v-if="editor!.isActive('quranMushaf')"
            severity="secondary"
            text
            rounded
            size="small"
            :label="t('editor.verse.viewTafsir')"
            @click="onAction"
          >
            <template #icon>
              <i class="pi pi-book text-xs" />
            </template>
          </Button>
          <span
            v-if="editor!.isActive('quranMushaf')"
            class="w-px h-4 bg-border mx-0.5 shrink-0"
          />
          <Button
            v-for="a in imageAlignments"
            :key="a.value"
            :icon="a.icon"
            severity="secondary"
            text
            rounded
            size="small"
            :class="{
              '!bg-accent/10 !text-accent':
                (editor!.isActive('imageNode')
                  ? editor!.getAttributes('imageNode').align
                  : editor!.getAttributes('quranMushaf').align) === a.value,
            }"
            @click="
              editor!.isActive('imageNode')
                ? setImageAlign(a.value)
                : setMushafAlign(a.value)
            "
          />
        </template>
      </AtomBubbleMenu>
      <EditorContent :editor="editor" class="flex-1 px-3" />
      <QuranSearchDialog
        v-model:visible="quranDialogVisible"
        @insert="insertQuranVerse"
        @insert-mushaf="insertQuranMushaf"
      />
      <HadithSearchDialog
        v-model:visible="hadithDialogVisible"
        @insert="insertHadith"
      />
      <ImageUploadDialog
        :file="pendingImageFile"
        @uploaded="onImageUploaded"
        @cancel="onImageUploadCancelled"
      />
    </template>
  </div>
</template>

<style>
.tiptap .is-empty::before {
  content: attr(data-placeholder);
  display: block;
  color: var(--color-muted);
  opacity: 0.5;
  pointer-events: none;
  height: 0;
}

.tiptap {
  font-family: inherit;
  line-height: 1.8;
  color: var(--color-ink);
}

/* ProseMirror disables ligatures globally to avoid Latin cursor-positioning
   bugs, which also kills Arabic shaping (lam-alif renders as isolated ل + ا).
   Re-enable on Arabic font runs. */
.tiptap .font-quran,
.tiptap .font-quran-uthmani {
  font-variant-ligatures: normal;
  -webkit-font-variant-ligatures: normal;
  font-feature-settings: "liga", "calt", "rlig";
}

.tiptap .search-result {
  background-color: color-mix(in srgb, var(--color-accent) 20%, transparent);
  border-radius: 0.1em;
}

.tiptap .search-result-current {
  background-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
  outline: 2px solid var(--color-accent);
  border-radius: 0.1em;
}

.tiptap .ProseMirror-selectednode {
  background-color: color-mix(in srgb, var(--color-accent) 15%, transparent);
  border-radius: 0.25rem;
  outline: none;
}

/* Resizable image-like nodes (Moveable-based NodeView) */
.tiptap figure[data-type="resizable-image"] {
  display: flex;
  margin: 0.75rem 0;
  direction: ltr;
  justify-content: center;
}

.tiptap figure[data-type="resizable-image"][data-align="left"] {
  justify-content: flex-start;
}

.tiptap figure[data-type="resizable-image"][data-align="right"] {
  justify-content: flex-end;
}

.tiptap figure[data-type="resizable-image"].ProseMirror-selectednode {
  background-color: transparent;
}

.tiptap figure[data-type="resizable-image"].ProseMirror-selectednode img {
  outline: 3px solid var(--color-accent);
  outline-offset: 3px;
}

.tiptap .image-node-img {
  border-radius: 0.375rem;
}

.tiptap .image-node-img[data-state="loading"],
.tiptap .image-node-img[data-state="failed"] {
  background-color: var(--color-bg-soft);
  min-width: 8rem;
  min-height: 6rem;
}

.tiptap .image-node-img[data-state="failed"] {
  cursor: pointer;
  outline: 1px dashed color-mix(in srgb, var(--color-muted) 40%, transparent);
}

/* Moveable handle sizing (touch-friendly) */
.moveable-control-box .moveable-control {
  width: 16px !important;
  height: 16px !important;
  margin-top: -8px !important;
  margin-left: -8px !important;
  background: var(--color-accent) !important;
  border: 2px solid var(--color-bg) !important;
  border-radius: 50% !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

@media (pointer: coarse) {
  .moveable-control-box .moveable-control {
    width: 22px !important;
    height: 22px !important;
    margin-top: -11px !important;
    margin-left: -11px !important;
  }
}

.tiptap h1,
.tiptap h2,
.tiptap h3 {
  color: var(--color-ink);
  font-weight: 700;
}

.tiptap h1 {
  font-size: 1.75rem;
  margin: 1.5rem 0 0.75rem;
}
.tiptap h2 {
  font-size: 1.375rem;
  margin: 1.25rem 0 0.625rem;
}
.tiptap h3 {
  font-size: 1.125rem;
  margin: 1rem 0 0.5rem;
}

.tiptap p {
  margin: 0.25rem 0;
}

.tiptap ul {
  list-style-type: disc;
  padding-inline-start: 1.5rem;
  margin: 0.5rem 0;
}

.tiptap ol {
  list-style-type: decimal;
  padding-inline-start: 1.5rem;
  margin: 0.5rem 0;
}

.tiptap blockquote {
  border-inline-start: 3px solid var(--color-accent);
  padding-inline-start: 1rem;
  color: var(--color-muted);
  margin: 0.75rem 0;
}

.tiptap code {
  background: var(--color-bg-soft);
  padding: 0.15rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.tiptap pre {
  background: var(--color-bg-soft);
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
}

.tiptap pre code {
  background: none;
  padding: 0;
}

.tiptap .tableWrapper {
  overflow-x: auto;
  margin: 1rem 0;
  -webkit-overflow-scrolling: touch;
}

.tiptap table {
  border-collapse: collapse;
  width: 100%;
  table-layout: fixed;
}

.tiptap table td,
.tiptap table th {
  border: 1px solid var(--color-border);
  padding: 0.5rem 0.75rem;
  vertical-align: top;
  position: relative;
  min-width: 80px;
}

.tiptap table th {
  background-color: var(--color-bg-soft);
  font-weight: 600;
}

.tiptap table .selectedCell {
  background-color: color-mix(in srgb, var(--color-accent) 12%, transparent);
}

.tiptap hr {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 1.5rem 0;
}

.tiptap mark {
  border-radius: 0.15em;
  padding: 0.05em 0.15em;
}

.tiptap u {
  text-decoration: underline;
}

.tiptap s {
  text-decoration: line-through;
}

.tiptap a {
  color: var(--color-accent);
  text-decoration: underline;
  cursor: pointer;
}

.tiptap div[data-type="details"] {
  display: flex;
  gap: 0.25rem;
  margin: 1rem 0;
  padding: 0.5rem;

  summary {
    display: block;
    font-weight: 700;
  }

  > button {
    align-items: center;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    font-size: 0.625rem;
    height: 1.25rem;
    justify-content: center;
    line-height: 1;
    margin-top: 0.1rem;
    padding: 0;
    width: 1.25rem;
    flex-shrink: 0;
    color: var(--color-muted);
    position: relative;
    z-index: 1;

    &:hover {
      background-color: var(--color-bg-soft);
    }

    &::before {
      content: "\25B6";
    }
  }

  &.is-open > button::before {
    transform: rotate(90deg);
  }

  &:dir(rtl) > button::before {
    transform: scaleX(-1);
  }

  &:dir(rtl).is-open > button::before {
    transform: scaleX(-1) rotate(90deg);
  }

  > div {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;

    > [data-type="detailsContent"] > :last-child {
      margin-bottom: 0.5rem;
    }
  }

  .tiptap div[data-type="details"] {
    margin: 0.5rem 0;
  }
}
</style>
