<script setup lang="ts">
import { NodeViewWrapper } from "@tiptap/vue-3";
import { HONORIFIC_BY_TYPE, type HonorificType } from "./honorifics";

const props = defineProps<{
  node: { attrs: { type: HonorificType } };
}>();

const def = HONORIFIC_BY_TYPE[props.node.attrs.type];
</script>

<template>
  <NodeViewWrapper as="span" class="inline" contenteditable="false">
    <span class="honorific" dir="rtl" :title="def.ar">
      {{ def.glyph }}
    </span>
  </NodeViewWrapper>
</template>

<style>
@font-face {
  font-family: "Kitab";
  src: url("../assets/fonts/kitab-phrases.woff2") format("woff2");
  unicode-range: U+FD40-FD4F, U+FDFA-FDFB, U+FDFD-FDFF;
  font-display: swap;
}
</style>

<style scoped>
.honorific {
  font-family: "Kitab", serif;
  font-size: 0.8em;
  line-height: 1;
  vertical-align: baseline;
  color: var(--color-accent);
  cursor: default;
}
</style>
