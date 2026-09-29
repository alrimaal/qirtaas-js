<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <div class="rounded-xl bg-bg-soft px-3 py-2.5 select-none">
    <div class="flex items-center gap-2 mb-1.5 min-h-6">
      <span
        class="text-[10px] font-bold uppercase tracking-wider text-muted shrink-0"
        >{{ label }}</span
      >
      <span class="flex-1" />
      <slot name="action" />
    </div>
    <slot />
  </div>
</template>
