<script setup lang="ts">
defineProps<{
  /** Surah name + range or `surah:ayah`; empty renders nothing. */
  reference: string;
  /** Verse text once loaded; null for a surah-only match or while loading. */
  text: string | null;
  /** Set when the lookup failed. */
  error: string | null;
  /** What Enter will do; empty while a lookup is in flight. */
  hint: string;
}>();

defineEmits<{ select: [] }>();
</script>

<template>
  <button
    v-if="reference"
    class="block w-max max-w-sm text-start bg-bg border border-border rounded-lg shadow-md p-3 cursor-pointer"
    @click="$emit('select')"
  >
    <span class="block text-xs text-muted">{{ reference }}</span>
    <span v-if="error" class="block mt-1 text-sm text-muted">{{ error }}</span>
    <template v-else>
      <span
        v-if="text"
        dir="rtl"
        class="font-quran block mt-1 text-lg leading-loose text-primary"
        >{{ text }}</span
      >
      <span v-if="hint" class="block mt-2 text-xs text-muted">{{ hint }}</span>
    </template>
  </button>
</template>
