<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Button from "primevue/button";
import WordRangePicker from "../WordRangePicker.vue";
import type { AyahResult } from "@qirtaas/core/services/quran";

const { t } = useI18n();

const props = defineProps<{
  verse: AyahResult;
  initialRange?: [number, number] | null;
}>();

const emit = defineEmits<{
  back: [];
  insert: [
    payload: {
      surah: number;
      ayah: number;
      surahNameArabic: string;
      surahNameEnglish: string;
      fromWord: number | null;
      toWord: number | null;
      text: string;
    }
  ];
  expandToBrowser: [];
}>();

type Selection = {
  fromWord: number;
  toWord: number;
  isFull: boolean;
  complete: boolean;
  text: string;
};

const selection = ref<Selection | null>(null);

// Reset the cached selection whenever the verse changes so a stale value from
// the previous verse can't be inserted before the picker re-emits.
watch(
  () => props.verse,
  () => {
    selection.value = null;
  }
);

function onInsert() {
  const sel = selection.value;
  if (!sel || !sel.complete) return;
  emit("insert", {
    surah: props.verse.surah.number,
    ayah: props.verse.number,
    surahNameArabic: props.verse.surah.name_arabic,
    surahNameEnglish: props.verse.surah.name_english,
    fromWord: sel.isFull ? null : sel.fromWord,
    toWord: sel.isFull ? null : sel.toWord,
    text: sel.text,
  });
}
</script>

<template>
  <div class="flex flex-col">
    <div class="flex items-center gap-2 mb-2">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        rounded
        size="small"
        :aria-label="t('quran.back')"
        class="[html[dir=rtl]_&]:rotate-180"
        @click="emit('back')"
      />
      <span class="text-xs text-muted">
        {{ verse.surah.name_arabic }} ({{ verse.surah.name_english }}) —
        {{ verse.surah.number }}:{{ verse.number }}
      </span>
    </div>

    <WordRangePicker
      class="mb-3"
      :text="verse.text"
      :initial-range="initialRange"
      text-class="font-quran text-[22px] leading-[2.4]"
      @change="selection = $event"
    />

    <p class="text-xs text-muted text-center mb-3">
      {{ t("quran.selectionHint") }}
    </p>

    <button
      type="button"
      class="w-full flex items-center gap-3 p-3 mb-3 border border-border rounded-xl hover:border-primary hover:bg-primary/[0.04] text-start font-[inherit] cursor-pointer transition-colors"
      @click="emit('expandToBrowser')"
    >
      <span
        class="w-9 h-9 rounded-[10px] bg-primary/10 text-primary text-base flex items-center justify-center shrink-0"
        >⊞</span
      >
      <span class="flex flex-col flex-1 min-w-0">
        <span class="text-[13px] font-semibold text-ink">{{
          t("quran.selectMoreVerses")
        }}</span>
        <span class="text-[11.5px] text-muted">{{
          t("quran.selectMoreVersesSub")
        }}</span>
      </span>
      <span class="text-muted [html[dir=rtl]_&]:rotate-180">→</span>
    </button>

    <div class="flex justify-end gap-2">
      <Button
        :label="t('quran.cancel')"
        severity="secondary"
        text
        size="small"
        @click="emit('back')"
      />
      <Button
        :label="t('quran.insert')"
        icon="pi pi-check"
        size="small"
        class="!bg-primary !text-white hover:!opacity-90"
        :disabled="!selection?.complete"
        @click="onInsert"
      />
    </div>
  </div>
</template>
