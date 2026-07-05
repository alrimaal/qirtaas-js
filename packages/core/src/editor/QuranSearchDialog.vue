<script setup lang="ts">
import { getOverlayAppendTo } from "../mount/overlay";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Dialog from "primevue/dialog";
import QuranSearchStep from "./quran/QuranSearchStep.vue";
import WordSelectStep from "./quran/WordSelectStep.vue";
import SurahBrowserStep from "./quran/SurahBrowserStep.vue";
import type { AyahResult, SurahMatch } from "@qirtaas/core/services/quran";
import type { Endpoint } from "./quran/useQuranSelection";

const { t } = useI18n();

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{
  "update:visible": [value: boolean];
  // Inline insert — backwards-compatible with the old single-verse shape.
  insert: [
    data: {
      surah: number;
      ayah: number;
      fromAyah: number | null;
      toAyah: number | null;
      fromWord: number | null;
      toWord: number | null;
      surahNameArabic: string;
      surahNameEnglish: string;
      text: string;
    }
  ];
  insertMushaf: [
    data: {
      page: number;
      lineStart: number;
      lineEnd: number;
      from: Endpoint;
      to: Endpoint;
      width: number;
      height: number;
    }
  ];
}>();

type Step = "search" | "word" | "browse";

const step = ref<Step>("search");
const selectedVerse = ref<AyahResult | null>(null);
const browsingSurah = ref<SurahMatch | null>(null);
const preselectVerse = ref<number | null>(null);
// When refining from the surah browser, remember the origin so "back" from
// the word step returns to the browser instead of resetting to search.
const wordOrigin = ref<"search" | "browse">("search");
const wordRange = ref<[number, number] | null>(null);

const dialogWidth = computed(() => (step.value === "browse" ? "42rem" : "32rem"));

function onSelectVerse(v: AyahResult) {
  selectedVerse.value = v;
  wordRange.value = null;
  wordOrigin.value = "search";
  step.value = "word";
}

function onRefineWords(p: {
  surah: number;
  ayah: number;
  fromWord: number;
  toWord: number;
  surahNameArabic: string;
  surahNameEnglish: string;
  text: string;
}) {
  selectedVerse.value = {
    surah: {
      number: p.surah,
      name_arabic: p.surahNameArabic,
      name_english: p.surahNameEnglish,
    },
    number: p.ayah,
    text: p.text,
  };
  wordRange.value = [p.fromWord, p.toWord];
  wordOrigin.value = "browse";
  // Preserve verse position so "back" lands the user on the right page
  // with that verse re-highlighted.
  preselectVerse.value = p.ayah;
  step.value = "word";
}

function onWordBack() {
  if (wordOrigin.value === "browse") {
    selectedVerse.value = null;
    wordRange.value = null;
    wordOrigin.value = "search";
    step.value = "browse";
  } else {
    back();
  }
}

function onBrowseSurah(s: SurahMatch) {
  browsingSurah.value = s;
  preselectVerse.value = null;
  step.value = "browse";
}

function onExpandToBrowser() {
  if (!selectedVerse.value) return;
  browsingSurah.value = {
    number: selectedVerse.value.surah.number,
    name_arabic: selectedVerse.value.surah.name_arabic,
    name_english: selectedVerse.value.surah.name_english,
    verse_count: 0,
  };
  preselectVerse.value = selectedVerse.value.number;
  step.value = "browse";
}

function onWordInsert(p: {
  surah: number;
  ayah: number;
  surahNameArabic: string;
  surahNameEnglish: string;
  fromWord: number | null;
  toWord: number | null;
  text: string;
}) {
  emit("insert", {
    surah: p.surah,
    ayah: p.ayah,
    fromAyah: null,
    toAyah: null,
    fromWord: p.fromWord,
    toWord: p.toWord,
    surahNameArabic: p.surahNameArabic,
    surahNameEnglish: p.surahNameEnglish,
    text: p.text,
  });
  close();
}

function onInlineInsert(p: {
  surah: number;
  fromAyah: number;
  toAyah: number;
  surahNameArabic: string;
  surahNameEnglish: string;
  text: string;
}) {
  emit("insert", {
    surah: p.surah,
    ayah: p.fromAyah,
    fromAyah: p.fromAyah,
    toAyah: p.toAyah,
    fromWord: null,
    toWord: null,
    surahNameArabic: p.surahNameArabic,
    surahNameEnglish: p.surahNameEnglish,
    text: p.text,
  });
  close();
}

function onMushafInsert(p: {
  page: number;
  lineStart: number;
  lineEnd: number;
  from: Endpoint;
  to: Endpoint;
  width: number;
  height: number;
}) {
  emit("insertMushaf", p);
  close();
}

function back() {
  step.value = "search";
  selectedVerse.value = null;
  browsingSurah.value = null;
  preselectVerse.value = null;
  wordRange.value = null;
  wordOrigin.value = "search";
}

function close() {
  emit("update:visible", false);
  back();
}

watch(
  () => props.visible,
  (v) => {
    if (!v) back();
  }
);
</script>

<template>
  <Dialog :append-to="getOverlayAppendTo()"
    :visible="props.visible"
    @update:visible="close"
    :header="t('quran.dialogTitle')"
    modal
    :style="{ width: dialogWidth }"
    :dismissable-mask="true"
  >
    <QuranSearchStep
      v-show="step === 'search'"
      :active="step === 'search'"
      @select-verse="onSelectVerse"
      @browse-surah="onBrowseSurah"
    />
    <WordSelectStep
      v-if="step === 'word' && selectedVerse"
      :verse="selectedVerse"
      :initial-range="wordRange"
      @back="onWordBack"
      @insert="onWordInsert"
      @expand-to-browser="onExpandToBrowser"
    />
    <SurahBrowserStep
      v-else-if="step === 'browse' && browsingSurah"
      :surah="browsingSurah"
      :preselect-verse="preselectVerse"
      @back="back"
      @insert-inline="onInlineInsert"
      @insert-mushaf="onMushafInsert"
      @refine-words="onRefineWords"
    />
  </Dialog>
</template>
