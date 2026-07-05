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
      <i :class="item.icon" class="text-sm text-muted" />
      <span>{{ item.label }}</span>
    </button>
    <div v-if="items.length === 0" class="py-2 px-3 text-xs text-muted">
      No commands found
    </div>
  </div>
</template>
