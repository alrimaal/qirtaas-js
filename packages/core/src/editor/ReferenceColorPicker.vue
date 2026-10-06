<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  REFERENCE_COLORS,
  referenceColorVar,
  useReferenceColors,
  type ReferenceColor,
  type ReferenceKind,
} from "../composables/useReferenceColors";

const props = defineProps<{
  kind: ReferenceKind;
  modelValue: ReferenceColor | null;
  /** Prepend a swatch for null ("follow my default"). */
  allowDefault?: boolean;
}>();

const emit = defineEmits<{ "update:modelValue": [ReferenceColor | null] }>();

const { t } = useI18n();
const { defaultColors } = useReferenceColors();

const options = computed(() => [
  ...(props.allowDefault ? [null] : []),
  ...REFERENCE_COLORS,
]);

function label(color: ReferenceColor | null) {
  return color
    ? t(`referenceColor.names.${color}`)
    : t("referenceColor.useDefault");
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-1.5"
    role="radiogroup"
    :aria-label="t('referenceColor.label')"
  >
    <button
      v-for="color in options"
      :key="color ?? 'default'"
      v-tooltip.bottom="label(color)"
      type="button"
      role="radio"
      :aria-checked="modelValue === color"
      :aria-label="label(color)"
      class="relative grid h-6 w-6 shrink-0 place-items-center rounded-full cursor-pointer transition-transform hover:scale-110"
      :class="
        modelValue === color
          ? 'ring-2 ring-offset-2 ring-offset-bg ring-primary/70'
          : ''
      "
      :style="
        color
          ? { background: referenceColorVar(color) }
          : { border: '1.5px dashed var(--color-muted)' }
      "
      @mousedown.prevent
      @click="emit('update:modelValue', color)"
    >
      <span
        v-if="!color"
        class="h-3 w-3 rounded-full"
        :style="{ background: referenceColorVar(defaultColors[kind]) }"
      />
    </button>
  </div>
</template>
