<script setup lang="ts">
import { computed } from "vue";
import { NodeViewWrapper } from "@tiptap/vue-3";
import { NodeSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/core";
import DOMPurify from "dompurify";

const props = defineProps<{
  node: {
    attrs: {
      collectionNameArabic: string;
      collectionNameEnglish: string;
      number: number;
      text: string;
    };
  };
  editor: Editor;
  getPos: () => number;
  deleteNode: () => void;
}>();

const sanitizedText = computed(() =>
  DOMPurify.sanitize(props.node.attrs.text ?? "", {
    FORBID_TAGS: ["sup", "p", "br"],
  }),
);

const selectNode = () => {
  const pos = props.getPos();
  const tr = props.editor.state.tr.setSelection(
    NodeSelection.create(props.editor.state.doc, pos),
  );
  props.editor.view.dispatch(tr);
};
</script>

<template>
  <NodeViewWrapper as="span" class="inline" contenteditable="false">
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
