<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NodeViewWrapper } from "@tiptap/vue-3";
import { NodeSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/core";
import { useI18n } from "vue-i18n";
import DOMPurify from "dompurify";
import HadithTranslationStrip from "./HadithTranslationStrip.vue";

const props = defineProps<{
  node: {
    attrs: {
      collectionNameArabic: string;
      collectionNameEnglish: string;
      number: number;
      text: string;
      translationOpen: boolean;
      displayMode: "inline" | "card";
    };
  };
  editor: Editor;
  getPos: () => number;
  deleteNode: () => void;
  updateAttributes: (attrs: Record<string, unknown>) => void;
}>();

const { t } = useI18n();

const isCard = computed(() => props.node.attrs.displayMode === "card");

const sanitizedText = computed(() =>
  DOMPurify.sanitize(props.node.attrs.text ?? "", {
    FORBID_TAGS: ["sup", "p", "br"],
  }),
);

// slug is stored as collectionNameEnglish (see HadithSearchDialog.insertHadith).
const slug = computed(() => props.node.attrs.collectionNameEnglish);

// Local mirror of the persisted translation-open attr. In editable docs the
// toggle is written back to the node; in read-only views it stays local
// (ephemeral), so readers can peek without mutating the document.
const open = ref(props.node.attrs.translationOpen);
watch(
  () => props.node.attrs.translationOpen,
  (v) => (open.value = v),
);

function toggle() {
  open.value = !open.value;
  if (props.editor.isEditable) {
    props.updateAttributes({ translationOpen: open.value });
  }
}

const selectNode = () => {
  const pos = props.getPos();
  const tr = props.editor.state.tr.setSelection(
    NodeSelection.create(props.editor.state.doc, pos),
  );
  props.editor.view.dispatch(tr);
};
</script>

<template>
  <!-- ── CARD MODE (inline atom painted as a block) ── -->
  <NodeViewWrapper
    v-if="isCard"
    as="span"
    contenteditable="false"
    class="block my-2 border border-border rounded-lg bg-bg-soft overflow-hidden"
  >
    <span class="flex items-center gap-2 px-3 py-2 bg-bg border-b border-border">
      <span dir="rtl" class="text-sm font-semibold text-primary">{{
        props.node.attrs.collectionNameArabic
      }}</span>
      <span class="text-xs text-muted"
        >{{ props.node.attrs.collectionNameEnglish }} #{{
          props.node.attrs.number
        }}</span
      >
      <span class="flex-1" />
      <button
        type="button"
        class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-border bg-bg-soft text-[0.65rem] font-semibold text-accent hover:border-accent/60 cursor-pointer select-none"
        :class="{ '!border-accent/60': open }"
        :aria-label="t('hadithDetail.translation')"
        :aria-expanded="open"
        @mousedown.stop
        @click.stop="toggle"
      >
        Aa
        <i
          class="pi pi-chevron-down text-[0.5rem] transition-transform"
          :class="{ 'rotate-180': open }"
        />
      </button>
    </span>
    <button
      class="block w-full text-start px-4 py-3 cursor-pointer"
      @click="selectNode"
    >
      <span
        dir="rtl"
        class="block text-right text-lg leading-loose text-hadith-text"
        v-html="sanitizedText"
      />
    </button>
    <span v-if="open" class="block px-4 pb-3" @mousedown.stop>
      <HadithTranslationStrip :slug="slug" :number="props.node.attrs.number" />
    </span>
  </NodeViewWrapper>

  <!-- ── INLINE MODE ── -->
  <NodeViewWrapper v-else as="span" class="inline" contenteditable="false">
    <button
      @click="selectNode"
      class="inline !no-underline !text-inherit cursor-pointer hover:!text-accent"
    >
      <span dir="rtl">
        <span class="text-[1.4em] leading-[0] text-accent/60 align-middle"
          >«</span
        >
        <span class="text-hadith-text" v-html="sanitizedText"></span
        ><span class="text-[1.4em] leading-[0] text-accent/60 align-middle"
          >»</span
        >
      </span>
      <span class="text-[0.7rem] text-muted ms-1"
        >[{{ props.node.attrs.collectionNameArabic }}
        {{ props.node.attrs.number }}]</span
      >
    </button>
  </NodeViewWrapper>
</template>
