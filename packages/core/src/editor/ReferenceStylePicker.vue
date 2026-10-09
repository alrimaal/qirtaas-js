<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import ReferenceFillPicker from "./ReferenceFillPicker.vue";
import {
  REFERENCE_COLORS,
  isReferenceColor,
  isReferenceFill,
  referenceColorVar,
  resolveReferenceColor,
  resolveReferenceFill,
  useReferenceColors,
  type ReferenceColor,
  type ReferenceFill,
  type ReferenceKind,
} from "../composables/useReferenceColors";

const props = defineProps<{
  kind: ReferenceKind;
  color: unknown;
  fill: unknown;
}>();

const emit = defineEmits<{
  "update:color": [ReferenceColor | null];
  "update:fill": [ReferenceFill | null];
  reset: [];
}>();

const { t } = useI18n();
const { defaultColors } = useReferenceColors();

const nodeColor = computed(() =>
  isReferenceColor(props.color) ? props.color : null
);
const effColor = computed(() => resolveReferenceColor(props.kind, props.color));
const effFill = computed(() => resolveReferenceFill(props.kind, props.fill));
const isDefault = computed(
  () => !nodeColor.value && !isReferenceFill(props.fill)
);

const swatches = computed(() => [null, ...REFERENCE_COLORS]);

const vars = (c: ReferenceColor) => ({ "--ref": referenceColorVar(c) });

function colorName(c: ReferenceColor | null) {
  return c
    ? t(`referenceColor.names.${c}`)
    : `${t("referenceColor.useDefault")} (${t(
        `referenceColor.names.${defaultColors.value[props.kind]}`
      )})`;
}
</script>

<template>
  <div class="grid gap-3 p-3 w-max max-w-[calc(100vw-2rem)]">
    <div>
      <div
        class="mb-1.5 font-[Geist_Mono,ui-monospace,monospace] text-[0.66rem] font-medium uppercase tracking-[0.1em] text-muted"
      >
        {{ t("referenceStyle.fill") }}
      </div>
      <ReferenceFillPicker
        :color="effColor"
        :model-value="effFill"
        @update:model-value="(f) => emit('update:fill', f)"
      />
    </div>

    <div>
      <div
        class="mb-1.5 flex justify-between gap-2 font-[Geist_Mono,ui-monospace,monospace] text-[0.66rem] font-medium uppercase tracking-[0.1em] text-muted"
      >
        {{ t("referenceColor.label") }}
        <span class="font-sans normal-case tracking-normal text-xs">{{
          t(`referenceColor.names.${effColor}`)
        }}</span>
      </div>
      <div
        class="flex flex-wrap gap-1.5"
        role="radiogroup"
        :aria-label="t('referenceColor.label')"
      >
        <button
          v-for="c in swatches"
          :key="c ?? 'default'"
          v-tooltip.top="colorName(c)"
          type="button"
          role="radio"
          :aria-checked="nodeColor === c"
          :aria-label="colorName(c)"
          :class="[
            `ref-fill-${effFill}`,
            nodeColor === c
              ? 'ring-2 ring-offset-2 ring-offset-bg ring-primary/70'
              : '',
            c
              ? 'border border-(--ref-cb) bg-(--ref-bg)'
              : 'border-[1.5px] border-dashed border-muted',
          ]"
          :style="vars(c ?? defaultColors[kind])"
          class="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] cursor-pointer transition-transform hover:scale-110"
          @mousedown.prevent
          @click="emit('update:color', c)"
        >
          <span
            v-if="c"
            class="h-2.5 w-2.5 rounded-full bg-(--ref-tc)"
          />
          <span
            v-else
            class="grid h-3.5 w-3.5 place-items-center rounded border border-(--ref-cb) bg-(--ref-bg)"
          >
            <span class="h-1.5 w-1.5 rounded-[2px] bg-(--ref-tc)" />
          </span>
        </button>
      </div>
    </div>

    <div
      class="flex items-center pt-2.5 border-t border-dashed border-border text-xs text-muted"
    >
      <span class="flex-1" />
      <span v-if="isDefault">{{ t(`referenceStyle.usingDefault.${kind}`) }}</span>
      <button
        v-else
        type="button"
        class="font-medium text-primary hover:underline cursor-pointer"
        @mousedown.prevent
        @click="emit('reset')"
      >
        {{ t("referenceStyle.reset") }}
      </button>
    </div>
  </div>
</template>
