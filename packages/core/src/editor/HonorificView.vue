<script setup lang="ts">
import { NodeViewWrapper } from "@tiptap/vue-3";
import type { HonorificType } from "./extensions/Honorific";

const GLYPHS: Record<HonorificType, { text: string; title: string }> = {
  jj: { text: "ﷻ", title: "جل جلاله" },
  saw: { text: "ﷺ", title: "صلى الله عليه وسلم" },
};

const props = defineProps<{
  node: { attrs: { type: HonorificType } };
}>();

const glyph = GLYPHS[props.node.attrs.type];
</script>

<template>
  <NodeViewWrapper as="span" class="inline" contenteditable="false">
    <span class="honorific" dir="rtl" :title="glyph.title">
      {{ glyph.text }}
    </span>
  </NodeViewWrapper>
</template>

<style scoped>
.honorific {
  font-size: 0.8em;
  line-height: 1;
  vertical-align: baseline;
  color: var(--color-accent);
  cursor: default;
}
</style>
