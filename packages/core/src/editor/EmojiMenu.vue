<script setup lang="ts">
defineProps<{
  items: { name: string; emoji?: string }[];
  selectedIndex: number;
}>();

defineEmits<{
  select: [item: { name: string; emoji?: string }];
}>();
</script>

<template>
  <div
    class="bg-bg border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto min-w-[200px]"
  >
    <button
      v-for="(item, index) in items"
      :key="item.name"
      :data-index="index"
      class="w-full text-start px-3 py-1.5 text-sm flex items-center gap-2 transition-colors duration-100"
      :class="
        index === selectedIndex
          ? 'bg-accent/10 text-primary'
          : 'text-muted hover:bg-bg-soft'
      "
      @click="$emit('select', item)"
    >
      <span class="text-base">{{ item.emoji }}</span>
      <span class="truncate">{{ item.name }}</span>
    </button>
    <div v-if="items.length === 0" class="px-3 py-2 text-sm text-muted">
      No emoji found
    </div>
  </div>
</template>
