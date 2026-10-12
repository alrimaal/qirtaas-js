<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { SearchReplace } from "./extensions/SearchReplace";
import { emojiSuggestion } from "./emojiSuggestion";
import Placeholder from "@tiptap/extension-placeholder";
import { documentExtensions } from "./extensions/schema";
import { useAtomDetail } from "./useAtomDetail";
import "./document.css";
import TableBubbleMenu from "./TableBubbleMenu.vue";
import AtomBubbleMenu from "./AtomBubbleMenu.vue";
import ReferenceStylePicker from "./ReferenceStylePicker.vue";
import ReferenceColorPicker from "./ReferenceColorPicker.vue";
import {
  isReferenceColor,
  resolveReferenceColor,
  resolveReferenceFill,
  referenceColorVar,
} from "@qirtaas/core/composables/useReferenceColors";
import Button from "primevue/button";
import { SlashCommand } from "./extensions/SlashCommand";
import { ToggleShortcuts } from "./extensions/ToggleShortcuts";
import { QuranReference } from "./extensions/QuranReference";
import {
  isHonorificType,
  trackHonorificInserted,
} from "./extensions/Honorific";
import { FileHandler } from "@tiptap/extension-file-handler";
import QuranSearchDialog from "./QuranSearchDialog.vue";
import type { AyahResult } from "@qirtaas/core/services/quran";
import HadithSearchDialog from "./HadithSearchDialog.vue";
import DocumentLinkPicker from "./DocumentLinkPicker.vue";
import ImageUploadDialog from "./ImageUploadDialog.vue";
import KeyboardShortcuts from "./KeyboardShortcuts.vue";
import CommandPalette from "./CommandPalette.vue";
import { buildCommands, COMMAND_DEFS, type ResolvedCommand } from "./commands";
import {
  useDocumentLinkHost,
  type DocumentLinkDocMeta,
} from "./runtime/context";
import { MAX_IMAGE_BYTES } from "@qirtaas/core/services/images";
import { useI18n } from "vue-i18n";
import { trackEvent } from "./runtime/analytics";
import { useVerseDetail } from "@qirtaas/core/composables/useVerseDetail";
import { useToast } from "primevue/usetoast";

const verseDetail = useVerseDetail();
const openAtomDetail = useAtomDetail();
const toast = useToast();

const props = withDefaults(
  defineProps<{
    modelValue: Record<string, unknown> | null;
    autofocus?: boolean;
    documentId?: string;
    /** Size to content with no page-level caret anchoring, for small embeds. */
    compact?: boolean;
    /** When false, pasted or dropped image files aren't uploaded. */
    images?: boolean;
  }>(),
  {
    autofocus: false,
    documentId: undefined,
    compact: false,
    images: true,
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: Record<string, unknown>];
  /** Fired once the TipTap instance is created and usable. */
  ready: [];
  "open-find-replace": [];
}>();

const { t, locale } = useI18n();

const quranDialogVisible = ref(false);
// When true, the Quran dialog opens straight to the collections step — used to
// resume a collection import after a Quran.com re-authorization round-trip.
const quranInitialCollections = ref(false);
const hadithDialogVisible = ref(false);
const documentLinkPickerVisible = ref(false);
const shortcutsVisible = ref(false);
const paletteVisible = ref(false);
const activeCommandIds = ref<Set<string>>(new Set());
const failedToLoad = ref(false);

function openShortcuts() {
  shortcutsVisible.value = true;
}

function openCommandPalette(source: "shortcut" | "button" = "button") {
  const ed = editor.value;
  activeCommandIds.value = new Set(
    ed ? COMMAND_DEFS.filter((c) => c.isActive?.(ed)).map((c) => c.id) : []
  );
  trackEvent("command_palette_opened", { source });
  paletteVisible.value = true;
}

const documentLinkHost = useDocumentLinkHost();

const paletteCommands = computed<ResolvedCommand[]>(() =>
  buildCommands({
    locale: locale.value,
    t,
    surface: "palette",
    commandFilter,
  })
);

const commandFilter = (id: string) => id !== "page" || documentLinkHost.enabled;

function runCommand(
  commandId: string,
  ed: import("@tiptap/core").Editor,
  source: "slash" | "palette"
) {
  const own = COMMAND_DEFS.find((c) => c.id === commandId)?.run;
  if (own) {
    own(ed);
    return;
  }
  if (commandId === "quran") {
    quranDialogVisible.value = true;
  } else if (commandId === "hadith") {
    hadithDialogVisible.value = true;
  } else if (commandId === "page") {
    documentLinkPickerVisible.value = true;
  } else if (commandId === "table") {
    insertTable();
  } else if (commandId === "findReplace") {
    emit("open-find-replace");
  } else if (commandId === "shortcuts") {
    openShortcuts();
  } else if (isHonorificType(commandId)) {
    ed.chain()
      .focus()
      .insertContent({ type: "honorific", attrs: { type: commandId } })
      .run();
    trackHonorificInserted(commandId, source);
  }
}

function onPaletteRun(command: ResolvedCommand) {
  const ed = editor.value;
  if (!ed) return;
  trackEvent("command_palette_command", { command: command.id });
  runCommand(command.id, ed, "palette");
}

function onCommandPaletteShortcut(e: KeyboardEvent) {
  if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
  if (e.key !== "k" && e.key !== "K") return;
  e.preventDefault();
  if (paletteVisible.value) paletteVisible.value = false;
  else openCommandPalette("shortcut");
}

function insertDocumentLink(doc: DocumentLinkDocMeta) {
  editor.value
    ?.chain()
    .focus()
    .insertDocumentLink(doc.id, doc.title || t("editor.pageLink.untitled"))
    .run();
  trackEvent("document_link_inserted");
}

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

// Inserted images default to at most this wide (aspect ratio kept); anything
// smaller keeps its natural size. Without it, large photos land at full
// natural width and swamp the document.
const DEFAULT_IMAGE_WIDTH = 480;

let pendingImageDims: { width: number; height: number } | null = null;

async function measureImage(file: File) {
  try {
    const bmp = await createImageBitmap(file);
    const dims = { width: bmp.width, height: bmp.height };
    bmp.close();
    return dims;
  } catch {
    return null;
  }
}

function startImageUpload(file: File, pos: number | null) {
  pendingImagePos = pos;
  pendingImageFile.value = file;
  // Decode in parallel with the upload; if it hasn't finished (or failed) by
  // insert time we fall back to unsized attrs, i.e. the old behavior.
  pendingImageDims = null;
  void measureImage(file).then((dims) => {
    if (pendingImageFile.value === file) pendingImageDims = dims;
  });
  trackEvent("image_upload_started");
}

function defaultImageSize() {
  if (!pendingImageDims) return { width: null, height: null };
  const scale = Math.min(1, DEFAULT_IMAGE_WIDTH / pendingImageDims.width);
  return {
    width: Math.round(pendingImageDims.width * scale),
    height: Math.round(pendingImageDims.height * scale),
  };
}

function onImageUploaded(imageId: string) {
  const ed = editor.value;
  pendingImageFile.value = null;
  if (!ed) return;
  const node = {
    type: "imageNode",
    attrs: { imageId, alt: "", ...defaultImageSize() },
  };
  if (pendingImagePos !== null) {
    const docSize = ed.state.doc.content.size;
    const pos = Math.min(Math.max(pendingImagePos, 0), docSize);
    ed.chain().focus().insertContentAt(pos, node).run();
  } else {
    ed.chain().focus().insertContent(node).run();
  }
  pendingImagePos = null;
  pendingImageDims = null;
  trackEvent("image_inserted");
}

function onImageUploadCancelled() {
  pendingImageFile.value = null;
  pendingImagePos = null;
  pendingImageDims = null;
}

function insertImageFromInput(file: File) {
  const picked = selectFirstImage([file]);
  if (!picked) return;
  const ed = editor.value;
  const pos = ed ? ed.state.selection.from : null;
  startImageUpload(picked, pos);
}

// ~1/3 of the viewport height, in px; the caret rests this far above the
// bottom edge. Guarded for SSR where `window` is absent.
function bottomAnchor(): number {
  if (props.compact || typeof window === "undefined") return 0;
  return Math.round(window.innerHeight / 3);
}

function contentClass(): string {
  if (props.compact) return "outline-none px-1 pt-4 pb-10";
  return "outline-none min-h-[70vh] px-1 py-4 pb-[33vh]";
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
    ...documentExtensions({
      documentId: props.documentId,
      translate: (key: string) => t(key),
      emojiSuggestion,
    }),
    ToggleShortcuts,
    Placeholder.configure({
      placeholder: ({ editor: ed, node, pos }) => {
        if (pos === 0 && node.type.name === "heading")
          return t("editor.pageLink.untitled");
        if (ed.state.doc.childCount === 1) return t("editor.placeholder");
        return t("editor.slashHint");
      },
      showOnlyCurrent: true,
    }),
    ...(props.images
      ? [
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
        ]
      : []),
    SearchReplace.configure({
      searchResultClass: "search-result",
    }),
    QuranReference.configure({
      locale: locale.value,
      translate: (key: string) => t(key),
      onInsert: insertQuranVerse,
    }),
    SlashCommand.configure({
      locale: locale.value,
      translate: (key: string) => t(key),
      commandFilter,
      onCommand: (commandId: string, ed: import("@tiptap/core").Editor) => {
        trackEvent("slash_command", { command: commandId });
        runCommand(commandId, ed, "slash");
      },
    }),
  ],
  editorProps: {
    // Keep the caret anchored ~1/3 from the bottom: when it enters the bottom
    // band (scrollThreshold) ProseMirror scrolls and leaves that much space
    // below it (scrollMargin). Values are px and recomputed on resize below.
    scrollThreshold: { top: 0, right: 0, bottom: bottomAnchor(), left: 0 },
    scrollMargin: { top: 0, right: 0, bottom: bottomAnchor(), left: 0 },
    attributes: {
      class: contentClass(),
    },
  },
  autofocus: props.autofocus ? "end" : false,
  onCreate: () => {
    emit("ready");
  },
  onUpdate: ({ editor: ed }) => {
    emit("update:modelValue", ed.getJSON() as Record<string, unknown>);
  },
});

// The scroll props are baked in at view creation, so recompute them when the
// viewport changes (resize, mobile keyboard/orientation) to keep the anchor.
function updateScrollAnchor() {
  const bottom = bottomAnchor();
  editor.value?.view.setProps({
    scrollThreshold: { top: 0, right: 0, bottom, left: 0 },
    scrollMargin: { top: 0, right: 0, bottom, left: 0 },
  });
}
onMounted(() => {
  if (!props.compact) window.addEventListener("resize", updateScrollAnchor);
  window.addEventListener("keydown", onCommandPaletteShortcut);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", updateScrollAnchor);
  window.removeEventListener("keydown", onCommandPaletteShortcut);
});

defineExpose({
  editor,
  openQuranDialog,
  openHadithDialog,
  openShortcuts,
  openCommandPalette,
  insertTable,
  insertImageFromInput,
});

// ---- Per-node verse/hadith style (atom bubble menu) ----

const stylePanelOpen = ref(false);

function selectedReferenceKind() {
  return editor.value?.isActive("hadithNode") ? "hadith" : "quran";
}

function selectedReferenceColor(attrs: Record<string, unknown> | null) {
  return resolveReferenceColor(selectedReferenceKind(), attrs?.color);
}

// AttrSteps keep the NodeSelection (a markup replace would drop it and close
// the bubble menu).
function setReferenceAttrs(attrs: { color?: string | null; fill?: string | null }) {
  const ed = editor.value;
  const selection = ed?.state.selection;
  if (!ed || !(selection instanceof NodeSelection)) return;
  const tr = ed.state.tr;
  for (const [name, value] of Object.entries(attrs)) {
    tr.setNodeAttribute(selection.from, name, value);
  }
  ed.view.dispatch(tr);
}

function setReferenceColor(color: string | null, displayMode: unknown) {
  setReferenceAttrs({ color });
  trackEvent("reference_color_changed", {
    kind: selectedReferenceKind(),
    color: color ?? "default",
    display_mode: displayMode,
  });
}

function setReferenceFill(fill: string | null) {
  setReferenceAttrs({ fill });
  trackEvent("reference_fill_changed", {
    kind: selectedReferenceKind(),
    fill: fill ?? "default",
  });
}

function resetReferenceStyle() {
  setReferenceAttrs({ color: null, fill: null });
  trackEvent("reference_style_reset", { kind: selectedReferenceKind() });
}

const onAtomAction = openAtomDetail;

function insertTable() {
  if (editor.value?.isActive("table")) return;
  editor.value
    ?.chain()
    .focus()
    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
    .run();
  trackEvent("table_inserted");
}

function openQuranDialog(opts?: { collections?: boolean }) {
  quranInitialCollections.value = !!opts?.collections;
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
  displayMode?: "inline" | "card";
}) {
  const displayMode = data.displayMode ?? "inline";
  editor.value
    ?.chain()
    .focus()
    .insertContent({
      type: "hadithNode",
      attrs: {
        ...data,
        displayMode,
        // Cards lead with the translation, so open the strip by default.
        translationOpen: displayMode === "card",
      },
    })
    .run();
  trackEvent("hadith_inserted", { collection: data.collectionNameEnglish });
  // Additional card-specific event; inline inserts keep only the base event.
  if (displayMode === "card") {
    trackEvent("hadith_card_inserted", {
      collection: data.collectionNameEnglish,
    });
  }
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
  displayMode?: "inline" | "card";
  isRef?: boolean | null;
}) {
  const displayMode = data.displayMode ?? "inline";
  editor.value
    ?.chain()
    .focus()
    .insertContent({
      type: "quranVerse",
      attrs: {
        ...data,
        encoding: "qpc_hafs",
        displayMode,
        // Cards lead with the translation, so open the strip by default.
        translationOpen: displayMode === "card",
      },
    })
    .run();
  const range =
    data.fromAyah != null &&
    data.toAyah != null &&
    data.fromAyah !== data.toAyah
      ? `${data.fromAyah}-${data.toAyah}`
      : undefined;
  if (data.isRef !== null && data.isRef) {
    trackEvent("quran_verse_ref_inserted", {
      surah: data.surah,
      ayah: data.ayah,
      range,
    });
  } else {
    trackEvent("quran_inserted", {
      surah: data.surah,
      ayah: data.ayah,
      range,
    });
    // Additional card-specific event; inline inserts keep only the base event.
    if (displayMode === "card") {
      trackEvent("quran_verse_card_inserted", {
        surah: data.surah,
        ayah: data.ayah,
        range,
      });
    }
  }
  if (verseDetail.isOpen.value) {
    verseDetail.open(data.surah, data.fromAyah ?? data.ayah, locale.value);
  }
}

function insertQuranVerses(payload: {
  verses: AyahResult[];
  displayMode: "inline" | "card";
}) {
  const { verses, displayMode } = payload;
  if (verses.length === 0) return;
  // Each verse gets its own paragraph so imported collections are navigable
  // (blank line between verses, cursor can land between them) rather than
  // colliding as inline atoms in one block.
  const nodes = verses.map((v) => ({
    type: "paragraph",
    content: [
      {
        type: "quranVerse",
        attrs: {
          surah: v.surah.number,
          ayah: v.number,
          fromAyah: null,
          toAyah: null,
          fromWord: null,
          toWord: null,
          surahNameArabic: v.surah.name_arabic,
          surahNameEnglish: v.surah.name_english,
          text: v.text,
          encoding: "qpc_hafs",
          displayMode,
          // Cards lead with the translation, so open the strip by default.
          translationOpen: displayMode === "card",
        },
      },
    ],
  }));
  // Single insertContent call = one undo step for the whole collection.
  editor.value?.chain().focus().insertContent(nodes).run();
  trackEvent("quran_collection_imported", {
    count: verses.length,
    displayMode,
  });
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
      <TableBubbleMenu v-if="editor" :editor="editor" />
      <AtomBubbleMenu
        v-if="editor"
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
          <!-- Cards get fill + colour; inline nodes just colour. -->
          <Button
            v-if="attrs?.displayMode === 'card'"
            severity="secondary"
            text
            rounded
            size="small"
            :label="t('referenceStyle.label')"
            :aria-expanded="stylePanelOpen"
            @click="stylePanelOpen = !stylePanelOpen"
          >
            <template #icon>
              <span
                :class="`ref-fill-${resolveReferenceFill(selectedReferenceKind(), attrs?.fill)}`"
                :style="{ '--ref': referenceColorVar(selectedReferenceColor(attrs)) }"
                class="grid h-4 w-5 place-items-center rounded border border-(--ref-cb) bg-(--ref-bg) text-[0.6rem] font-bold text-(--ref-tc)"
                >A</span
              >
            </template>
          </Button>
          <Button
            v-else
            severity="secondary"
            text
            rounded
            size="small"
            :label="t('referenceColor.label')"
            :aria-expanded="stylePanelOpen"
            @click="stylePanelOpen = !stylePanelOpen"
          >
            <template #icon>
              <span
                class="h-3 w-3 rounded-full"
                :style="{ background: referenceColorVar(selectedReferenceColor(attrs)) }"
              />
            </template>
          </Button>
        </template>
        <template #panel="{ attrs }">
          <div
            v-if="stylePanelOpen && attrs?.displayMode === 'card'"
            class="border-t border-border"
          >
            <ReferenceStylePicker
              :kind="selectedReferenceKind()"
              :color="attrs?.color"
              :fill="attrs?.fill"
              @update:color="(c) => setReferenceColor(c, 'card')"
              @update:fill="setReferenceFill"
              @reset="resetReferenceStyle"
            />
          </div>
          <div
            v-else-if="stylePanelOpen"
            class="border-t border-border px-2.5 py-2"
          >
            <ReferenceColorPicker
              :kind="selectedReferenceKind()"
              :model-value="isReferenceColor(attrs?.color) ? attrs.color : null"
              allow-default
              @update:model-value="(c) => setReferenceColor(c, 'inline')"
            />
          </div>
        </template>
      </AtomBubbleMenu>
      <AtomBubbleMenu
        v-if="editor"
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
        :initial-collections="quranInitialCollections"
        @insert="insertQuranVerse"
        @insert-mushaf="insertQuranMushaf"
        @insert-verses="insertQuranVerses"
      />
      <HadithSearchDialog
        v-model:visible="hadithDialogVisible"
        @insert="insertHadith"
      />
      <DocumentLinkPicker
        v-if="documentLinkHost.enabled"
        v-model:visible="documentLinkPickerVisible"
        :exclude-id="props.documentId"
        @select="insertDocumentLink"
      />
      <ImageUploadDialog
        :file="pendingImageFile"
        @uploaded="onImageUploaded"
        @cancel="onImageUploadCancelled"
      />
      <KeyboardShortcuts v-model:visible="shortcutsVisible" />
      <CommandPalette
        v-model:visible="paletteVisible"
        :commands="paletteCommands"
        :active-ids="activeCommandIds"
        @run="onPaletteRun"
      />
    </template>
  </div>
</template>
