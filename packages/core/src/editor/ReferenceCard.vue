<script lang="ts">
import {
  referenceColorVar,
  type ReferenceColor,
  type ReferenceFill,
} from "../composables/useReferenceColors";

// Bound on the node view's single card NodeViewWrapper. TipTap keeps the root
// element from mount, so switching fills must never swap it.
export function referenceCardWrapper(fill: ReferenceFill, color: ReferenceColor) {
  return fill === "paper"
    ? {
        class:
          "block my-2 border border-border rounded-lg bg-bg-soft overflow-hidden",
      }
    : {
        class: `ref-card ref-fill-${fill} block my-2 overflow-hidden rounded-[10px] border border-(--ref-cb) bg-(--ref-bg) cursor-pointer transition-colors`,
        style: { "--ref": referenceColorVar(color) },
      };
}
</script>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

// Colophon layout (non-paper fills): text first, reference in a footer band.
defineProps<{
  open: boolean;
  nameArabic: string;
  reference: string;
}>();

const emit = defineEmits<{ toggle: [] }>();

const { t } = useI18n();
</script>

<template>
  <span class="block px-6 pt-5 pb-3.5">
    <span
      dir="rtl"
      class="block text-center text-lg leading-loose text-balance text-(--ref-tc)"
    >
      <slot name="text" />
    </span>
    <span
      v-if="open"
      class="block max-w-[520px] mx-auto mt-2 text-center text-(--ref-mt)"
      @mousedown.stop
    >
      <slot name="translation" />
    </span>
  </span>
  <span
    class="ref-card-footer flex items-center gap-2.5 py-1.5 pe-2.5 ps-4 bg-(--ref-hbg) border-t border-(--ref-cb) text-(--ref-mt) transition-colors"
  >
    <span
      dir="rtl"
      class="text-sm font-semibold text-(--ref-ht)"
      >{{ nameArabic }}</span
    >
    <span
      class="font-[Geist_Mono,ui-monospace,monospace] text-[0.66rem] font-medium uppercase tracking-[0.1em]"
      >{{ reference }}</span
    >
    <span class="flex-1" />
    <slot v-if="open" name="edition" />
    <button
      type="button"
      class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-(--ref-ht) hover:bg-(--ref-ht)/10 cursor-pointer select-none"
      :aria-expanded="open"
      @mousedown.stop
      @click.stop="emit('toggle')"
    >
      {{ t("verseDetail.translation") }}
      <i
        class="pi pi-chevron-down text-[0.55rem] transition-transform"
        :class="{ 'rotate-180': open }"
      />
    </button>
  </span>
</template>
