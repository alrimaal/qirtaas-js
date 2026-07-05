<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import InputText from "primevue/inputtext";
import {
  searchQuran,
  SURAHS,
  type AyahResult,
  type SurahMatch,
} from "@qirtaas/core/services/quran";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{ active?: boolean }>(),
  { active: true },
);
const emit = defineEmits<{
  selectVerse: [verse: AyahResult];
  browseSurah: [surah: SurahMatch];
}>();

const query = ref("");
const surahMatches = ref<SurahMatch[]>([]);
const verseMatches = ref<AyahResult[]>([]);
const loading = ref(false);
const error = ref("");
const activeIdx = ref(0);
const listEl = ref<HTMLElement | null>(null);
const inputEl = ref<(InstanceType<typeof InputText> & { $el: HTMLInputElement }) | null>(null);

let debounce: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  // Empty state shows the full surah index — no network call.
  surahMatches.value = SURAHS.map((s) => ({
    number: s.number,
    name_arabic: s.name_arabic,
    name_english: s.name_english,
    verse_count: s.verse_count,
  }));
});

// When the user navigates back to the search step within the same dialog
// session, refresh results for the preserved query and refocus the input.
watch(
  () => props.active,
  (isActive, wasActive) => {
    if (!isActive || wasActive) return;
    nextTick(() => {
      (inputEl.value?.$el as HTMLInputElement | undefined)?.focus();
    });
    const trimmed = query.value.trim();
    if (trimmed) void doSearch(trimmed);
  },
);

watch(query, (val) => {
  if (debounce) clearTimeout(debounce);
  error.value = "";
  activeIdx.value = 0;
  const trimmed = val.trim();
  if (!trimmed) {
    // Cleared — reset to the static surah list, no fetch.
    surahMatches.value = SURAHS.map((s) => ({
      number: s.number,
      name_arabic: s.name_arabic,
      name_english: s.name_english,
      verse_count: s.verse_count,
    }));
    verseMatches.value = [];
    return;
  }
  if (/^\d+:\d+$/.test(trimmed)) {
    void doSearch(trimmed);
    return;
  }
  debounce = setTimeout(() => doSearch(trimmed), 350);
});

async function doSearch(q: string) {
  loading.value = true;
  error.value = "";
  try {
    const { surahs, verses } = await searchQuran(q);
    surahMatches.value = surahs;
    verseMatches.value = verses;
    if (verses.length === 0 && surahs.length === 0) {
      error.value = t("quran.noResults");
    }
  } catch {
    error.value = t("quran.searchError");
    surahMatches.value = [];
    verseMatches.value = [];
  } finally {
    loading.value = false;
  }
}

function onKeydown(e: KeyboardEvent) {
  const total = verseMatches.value.length;
  if (total === 0) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeIdx.value = (activeIdx.value + 1) % total;
    scrollIntoView();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeIdx.value = (activeIdx.value - 1 + total) % total;
    scrollIntoView();
  } else if (e.key === "Enter") {
    e.preventDefault();
    const v = verseMatches.value[activeIdx.value];
    if (v) emit("selectVerse", v);
  }
}

function scrollIntoView() {
  nextTick(() => {
    const rows = listEl.value?.querySelectorAll<HTMLElement>(
      "[data-verse-row]"
    );
    rows?.[activeIdx.value]?.scrollIntoView({ block: "nearest" });
  });
}
</script>

<template>
  <div class="flex flex-col">
    <InputText
      ref="inputEl"
      v-model="query"
      :placeholder="t('quran.searchPlaceholder')"
      class="!w-full mb-3"
      autofocus
      @keydown="onKeydown"
    />

    <div v-if="loading" class="flex justify-center py-6">
      <i class="pi pi-spinner pi-spin text-xl text-muted" />
    </div>

    <div v-else-if="error" class="text-sm text-muted text-center py-4">
      {{ error }}
    </div>

    <div v-else ref="listEl" class="flex flex-col gap-1 max-h-80 overflow-y-auto">
      <!-- Surah-name matches -->
      <template v-if="surahMatches.length > 0">
        <div
          class="text-[10px] font-bold uppercase tracking-wider text-muted px-3 pt-2 pb-1"
        >
          {{ t("quran.surahsSection") }}
        </div>
        <button
          v-for="s in surahMatches"
          :key="`s${s.number}`"
          type="button"
          class="flex items-center gap-3 p-3 rounded-xl border border-border bg-gradient-to-br from-primary/[0.04] to-transparent hover:border-primary text-start font-[inherit] cursor-pointer transition-colors"
          @click="emit('browseSurah', s)"
        >
          <span
            class="w-9 h-9 rounded-[10px] bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0"
            >{{ s.number }}</span
          >
          <span class="flex flex-col flex-1 min-w-0 gap-0.5">
            <span class="flex items-baseline gap-2 flex-wrap">
              <span class="text-base font-bold text-primary" dir="rtl">{{
                s.name_arabic
              }}</span>
              <span class="text-[13px] font-medium text-ink">{{
                s.name_english
              }}</span>
            </span>
            <span class="text-[11px] text-muted">
              {{ s.verse_count }} {{ t("quran.verses") }}
            </span>
          </span>
          <span
            class="inline-flex items-center gap-1 px-2.5 py-1 text-[11.5px] font-semibold text-primary bg-bg border border-primary/25 rounded-full whitespace-nowrap"
          >
            {{ t("quran.browse") }} <span class="[html[dir=rtl]_&]:rotate-180">→</span>
          </span>
        </button>
      </template>

      <!-- Verse matches -->
      <template v-if="verseMatches.length > 0">
        <div
          v-if="surahMatches.length > 0"
          class="text-[10px] font-bold uppercase tracking-wider text-muted px-3 pt-3 pb-1"
        >
          {{ t("quran.versesSection") }}
        </div>
        <div
          v-for="(v, i) in verseMatches"
          :key="`${v.surah.number}:${v.number}`"
          data-verse-row
          role="button"
          tabindex="0"
          class="flex flex-col gap-1.5 p-3 rounded-xl border cursor-pointer text-start font-[inherit] transition-colors"
          :class="
            i === activeIdx
              ? 'bg-bg-soft border-border'
              : 'bg-transparent border-transparent hover:bg-bg-soft hover:border-border'
          "
          @click="emit('selectVerse', v)"
          @mouseenter="activeIdx = i"
          @keydown.enter.prevent="emit('selectVerse', v)"
          @keydown.space.prevent="emit('selectVerse', v)"
        >
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 cursor-pointer font-[inherit] transition-colors"
              :title="t('quran.openSurahInMushaf', { name: v.surah.name_english })"
              @click.stop="
                emit('browseSurah', {
                  number: v.surah.number,
                  name_arabic: v.surah.name_arabic,
                  name_english: v.surah.name_english,
                  verse_count: 0,
                })
              "
            >
              <span class="text-xs font-bold text-primary">{{
                v.surah.name_arabic
              }}</span>
              <span class="text-[11px] font-medium text-primary opacity-75">{{
                v.surah.name_english
              }}</span>
              <span class="text-[10px] text-primary opacity-60">→</span>
            </button>
            <span class="text-[11px] text-muted font-medium"
              >{{ v.surah.number }}:{{ v.number }}</span
            >
          </div>
          <div
            class="text-[15px] text-ink leading-[1.8] line-clamp-2 font-quran"
            dir="rtl"
          >
            {{ v.text }}
          </div>
        </div>
      </template>

    </div>
  </div>
</template>
