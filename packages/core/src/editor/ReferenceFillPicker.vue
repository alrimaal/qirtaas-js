<script setup lang="ts">
import { useI18n } from "vue-i18n";
import {
  REFERENCE_FILLS,
  referenceColorVar,
  type ReferenceColor,
  type ReferenceFill,
} from "../composables/useReferenceColors";

// Fill tiles, each a mini card previewed in `color`.
defineProps<{
  color: ReferenceColor;
  modelValue: ReferenceFill;
}>();

const emit = defineEmits<{ "update:modelValue": [ReferenceFill] }>();

const { t } = useI18n();
</script>

<template>
  <div class="grid grid-cols-4 gap-1.5" role="radiogroup">
    <button
      v-for="f in REFERENCE_FILLS"
      :key="f"
      type="button"
      role="radio"
      :aria-checked="modelValue === f"
      class="grid justify-items-center gap-1.5 px-1.5 pt-1.5 pb-1 rounded-lg border text-xs font-medium cursor-pointer hover:bg-ink/5"
      :class="
        modelValue === f
          ? 'border-primary/55 bg-ink/5 text-ink'
          : 'border-transparent text-muted'
      "
      @mousedown.prevent
      @click="emit('update:modelValue', f)"
    >
      <span
        :style="{ '--ref': referenceColorVar(color) }"
        :class="[
          `ref-fill-${f}`,
          f === 'paper' ? 'grid-rows-[10px_1fr]' : 'grid-rows-[1fr_10px]',
        ]"
        class="grid w-[62px] h-10 overflow-hidden rounded-md border border-(--ref-cb) bg-(--ref-bg)"
      >
        <span
          v-if="f === 'paper'"
          class="bg-(--ref-hbg) border-b border-(--ref-cb)"
        />
        <span
          class="grid content-center gap-[3px]"
          :class="
            f === 'paper' ? 'justify-items-end px-[7px]' : 'justify-items-center'
          "
        >
          <span class="h-[3px] w-10 rounded-sm bg-(--ref-tc)" />
          <span class="h-[3px] w-[26px] rounded-sm bg-(--ref-tc)" />
        </span>
        <span
          v-if="f !== 'paper'"
          class="ref-card-footer bg-(--ref-hbg) border-t border-(--ref-cb)"
        />
      </span>
      {{ t(`referenceStyle.fills.${f}`) }}
    </button>
  </div>
</template>
