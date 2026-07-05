<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    /** The full text to pick a word range from. */
    text: string;
    /** Initial [from, to] word indices. Defaults to the whole text. */
    initialRange?: [number, number] | null;
    /**
     * Tailwind classes controlling the text's font, size and leading, e.g.
     * `font-quran text-[22px] leading-[2.4]`. Layout/colour are fixed.
     */
    textClass?: string;
  }>(),
  {
    initialRange: null,
    textClass: "text-lg leading-[2.2]",
  }
);

const emit = defineEmits<{
  change: [
    payload: {
      fromWord: number;
      toWord: number;
      /** True when the selection spans the entire text. */
      isFull: boolean;
      /** False while the user has placed Start and is waiting to place End. */
      complete: boolean;
      text: string;
    }
  ];
}>();

const words = computed(() => props.text.split(/\s+/).filter(Boolean));
const lastIdx = computed(() => Math.max(0, words.value.length - 1));

const startIdx = ref(0);
const endIdx = ref(0);
// `bothSet=false` means the user just placed Start and is waiting to place End.
const bothSet = ref(true);

function initFromProps() {
  const last = lastIdx.value;
  if (props.initialRange) {
    startIdx.value = Math.min(Math.max(0, props.initialRange[0]), last);
    endIdx.value = Math.min(Math.max(0, props.initialRange[1]), last);
  } else {
    startIdx.value = 0;
    endIdx.value = last;
  }
  bothSet.value = true;
}

initFromProps();
watch(() => props.text, initFromProps);

function handleTap(i: number) {
  if (!bothSet.value) {
    // Second tap places the end. Auto-swap if before the start.
    if (i < startIdx.value) {
      endIdx.value = startIdx.value;
      startIdx.value = i;
    } else {
      endIdx.value = i;
    }
    bothSet.value = true;
    return;
  }
  // Both set — start a fresh selection from this word.
  startIdx.value = i;
  endIdx.value = i;
  bothSet.value = false;
}

const lo = computed(() => Math.min(startIdx.value, endIdx.value));
const hi = computed(() => Math.max(startIdx.value, endIdx.value));
const isFull = computed(
  () => bothSet.value && lo.value === 0 && hi.value === lastIdx.value
);

watch(
  [lo, hi, bothSet, isFull],
  () => {
    emit("change", {
      fromWord: lo.value,
      toWord: hi.value,
      isFull: isFull.value,
      complete: bothSet.value,
      text: words.value.slice(lo.value, hi.value + 1).join(" "),
    });
  },
  { immediate: true }
);

function chipState(
  i: number
): "start" | "end" | "only" | "pending" | "in-range" | "idle" {
  if (!bothSet.value) return i === startIdx.value ? "pending" : "idle";
  if (startIdx.value === endIdx.value)
    return i === startIdx.value ? "only" : "idle";
  if (i === startIdx.value) return "start";
  if (i === endIdx.value) return "end";
  if (i > lo.value && i < hi.value) return "in-range";
  return "idle";
}
</script>

<template>
  <div>
    <div
      class="p-4 bg-bg-soft rounded-xl text-right select-none"
      :class="textClass"
      dir="rtl"
    >
      <span
        v-for="(w, i) in words"
        :key="i"
        role="button"
        tabindex="0"
        class="cursor-pointer rounded px-0.5 transition-colors"
        :class="{
          'bg-primary text-white px-1.5 py-0.5': [
            'start',
            'end',
            'only',
            'pending',
          ].includes(chipState(i)),
          'bg-primary/15 text-primary': chipState(i) === 'in-range',
          'text-muted hover:text-ink': chipState(i) === 'idle',
        }"
        @click="handleTap(i)"
        @keydown.enter.prevent="handleTap(i)"
        @keydown.space.prevent="handleTap(i)"
        >{{ w }}{{ i < words.length - 1 ? " " : "" }}</span
      >
    </div>

    <div v-if="!bothSet" class="flex justify-end mt-2">
      <span class="text-[11.5px] text-primary">{{
        t("wordSelect.tapEndWord")
      }}</span>
    </div>
  </div>
</template>
