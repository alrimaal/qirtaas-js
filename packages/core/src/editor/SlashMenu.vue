<script setup lang="ts">
import type { SlashCommandItem } from "./extensions/SlashCommand";

defineProps<{
  items: SlashCommandItem[];
  selectedIndex: number;
}>();

const emit = defineEmits<{
  select: [item: SlashCommandItem];
}>();
</script>

<template>
  <div class="bg-bg border border-border rounded-lg shadow-md p-1 min-w-48">
    <button
      v-for="(item, index) in items"
      :key="item.id"
      class="flex items-center gap-2 w-full py-2 px-3 border-none rounded-md text-sm font-[inherit] cursor-pointer text-start"
      :class="
        index === selectedIndex
          ? 'bg-accent/10 text-accent'
          : ' bg-transparent text-ink'
      "
      @click="emit('select', item)"
    >
      <span
        v-if="item.glyph"
        class="honorific-glyph w-4 text-center text-base leading-none"
        >{{ item.glyph }}</span
      >
      <i v-else :class="item.icon" class="text-sm text-muted" />
      <span>{{ item.label }}</span>
    </button>
    <div v-if="items.length === 0" class="py-2 px-3 text-xs text-muted">
      No commands found
    </div>
  </div>
</template>

<style scoped>
/* Honorific code points render as tofu in the default font; Kitab (the same
   @font-face declared in HonorificView) covers them. unicode-range keeps Kitab
   scoped to those glyphs, so non-honorific text is unaffected. */
.honorific-glyph {
  font-family: "Kitab", serif;
}
</style>
