<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NodeViewWrapper } from "@tiptap/vue-3";
import { NodeSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/core";
import { useI18n } from "vue-i18n";
import HadithTranslationStrip from "./HadithTranslationStrip.vue";
import SanitizedHtml from "./SanitizedHtml.vue";
import ReferenceCard, { referenceCardWrapper } from "./ReferenceCard.vue";
import {
  resolveReferenceColor,
  resolveReferenceFill,
  referenceColorVar,
} from "../composables/useReferenceColors";

const props = defineProps<{
  node: {
    attrs: {
      collectionNameArabic: string;
      collectionNameEnglish: string;
      number: number;
      text: string;
      translationOpen: boolean;
      displayMode: "inline" | "card";
      color: string | null;
      fill: string | null;
    };
  };
  editor: Editor;
  getPos: () => number;
  deleteNode: () => void;
  updateAttributes: (attrs: Record<string, unknown>) => void;
}>();

const { t } = useI18n();

const color = computed(() =>
  resolveReferenceColor("hadith", props.node.attrs.color)
);
const fill = computed(() => resolveReferenceFill("hadith", props.node.attrs.fill));
const textStyle = computed(() => ({ color: referenceColorVar(color.value) }));

const isCard = computed(() => props.node.attrs.displayMode === "card");

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
    v-bind="referenceCardWrapper(fill, color)"
    @click="fill !== 'paper' && selectNode()"
  >
    <!-- Paper: the original card. -->
    <template v-if="fill === 'paper'">
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
        <SanitizedHtml
          policy="compact"
          :html="props.node.attrs.text"
          dir="rtl"
          :style="textStyle"
          class="block text-right text-lg leading-loose"
        />
      </button>
      <span v-if="open" class="block px-4 pb-3" @mousedown.stop>
        <HadithTranslationStrip :slug="slug" :number="props.node.attrs.number" />
      </span>
    </template>
    <!-- Other fills: colophon layout. -->
    <ReferenceCard
      v-else
      :open="open"
      :name-arabic="props.node.attrs.collectionNameArabic"
      :reference="`${props.node.attrs.collectionNameEnglish} · #${props.node.attrs.number}`"
      @toggle="toggle"
    >
      <template #text>
        <SanitizedHtml policy="compact" :html="props.node.attrs.text" />
      </template>
      <template #translation>
        <HadithTranslationStrip
          :slug="slug"
          :number="props.node.attrs.number"
          bare
          plain
        />
      </template>
    </ReferenceCard>
  </NodeViewWrapper>

  <!-- ── INLINE MODE ── -->
  <NodeViewWrapper v-else as="span" class="inline" contenteditable="false">
    <button
      @click="selectNode"
      class="inline !no-underline !text-inherit cursor-pointer hover:!text-accent"
      :style="{ '--ref': referenceColorVar(color) }"
    >
      <span dir="rtl">
        <span class="text-[1.4em] leading-[0] text-(--ref)/60 align-middle"
          >«</span
        >
        <SanitizedHtml
          policy="compact"
          :html="props.node.attrs.text"
          class="text-(--ref)"
        /><span class="text-[1.4em] leading-[0] text-(--ref)/60 align-middle"
          >»</span
        >
      </span>
      <span class="text-[0.7rem] text-(--ref)/70 ms-1"
        >[{{ props.node.attrs.collectionNameArabic }}
        {{ props.node.attrs.number }}]</span
      >
    </button>
  </NodeViewWrapper>
</template>
