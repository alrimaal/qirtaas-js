<script setup lang="ts">
import { computed } from "vue";
import { NodeViewWrapper } from "@tiptap/vue-3";
import { NodeSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/core";
import { formatReference } from "./quran/formatReference";

const props = defineProps<{
  node: {
    attrs: {
      surah: number;
      ayah: number;
      fromAyah: number | null;
      toAyah: number | null;
      fromWord: number | null;
      toWord: number | null;
      surahNameArabic: string;
      surahNameEnglish: string;
      text: string;
      encoding: "uthmani" | "qpc_hafs";
    };
  };
  editor: Editor;
  getPos: () => number;
  deleteNode: () => void;
}>();

const reference = computed(() => formatReference(props.node.attrs));

const fontClass = computed(() =>
  props.node.attrs.encoding === "qpc_hafs" ? "font-quran" : "font-quran-uthmani"
);

const selectNode = () => {
  const pos = props.getPos();
  const tr = props.editor.state.tr.setSelection(
    NodeSelection.create(props.editor.state.doc, pos)
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
      <span dir="rtl" :class="fontClass">
        <span class="text-[1.8em] leading-[0] text-accent/60 align-middle"
          >﴿
        </span>
        <span class="text-primary">{{ props.node.attrs.text }}</span
        ><span class="text-[1.8em] leading-[0] text-accent/60 align-middle">
          ﴾</span
        ></span
      >
      <span class="text-[0.7rem] text-muted ms-1">[{{ reference }}]</span>
    </button>
  </NodeViewWrapper>
</template>
