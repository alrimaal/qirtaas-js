import { computed, ref } from "vue";
import {
  getVerseDetail,
  type VerseDetail,
  type VerseTafsir,
} from "@qirtaas/core/services/quran";
import { SURAHS } from "@qirtaas/core/data/mushaf";
import { trackEvent } from "@qirtaas/core/editor/runtime/analytics";

// Module-level state — shared across all consumers (singleton).
const isOpen = ref(false);
const loading = ref(false);
const error = ref(false);
const data = ref<VerseDetail | null>(null);
const activeSurah = ref<number | null>(null);
const activeAyah = ref<number | null>(null);
const currentLocale = ref<string>("en");

const TAFSIR_SLUG_STORAGE_KEY = "verseDetail.selectedTafsirSlug";
const TAFSIR_LANGUAGE_STORAGE_KEY = "verseDetail.selectedTafsirLanguage";

function readStorage(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

const selectedTafsirSlug = ref<string | null>(
  readStorage(TAFSIR_SLUG_STORAGE_KEY)
);
const selectedTafsirLanguage = ref<string | null>(
  readStorage(TAFSIR_LANGUAGE_STORAGE_KEY)
);

function setSelectedTafsirSlug(slug: string) {
  selectedTafsirSlug.value = slug;
  try {
    localStorage.setItem(TAFSIR_SLUG_STORAGE_KEY, slug);
  } catch {
    /* ignore */
  }
}

function setSelectedTafsirLanguage(language: string) {
  selectedTafsirLanguage.value = language;
  try {
    localStorage.setItem(TAFSIR_LANGUAGE_STORAGE_KEY, language);
  } catch {
    /* ignore */
  }
}

/** Unique tafsir languages available in the current verse response (unsorted). */
const availableTafsirLanguages = computed<string[]>(() => {
  const tafsirs = data.value?.tafsirs ?? [];
  return Array.from(new Set(tafsirs.map((tf) => tf.language)));
});

/**
 * Resolve the effective tafsir language:
 * 1. User's persisted choice if still available.
 * 2. Default mapped from UI locale (ar -> arabic, else english).
 * 3. First available language as a final fallback.
 */
function resolveTafsirLanguage(uiLocale: string): string | null {
  const available = availableTafsirLanguages.value;
  if (available.length === 0) return null;

  const stored = selectedTafsirLanguage.value;
  if (stored && available.includes(stored)) return stored;

  const localeDefault = uiLocale === "ar" ? "arabic" : "english";
  if (available.includes(localeDefault)) return localeDefault;

  return available[0] ?? null;
}

/** Tafsirs filtered to the currently-effective language. */
function tafsirsForLanguage(language: string | null): VerseTafsir[] {
  if (!language) return [];
  return (data.value?.tafsirs ?? []).filter((tf) => tf.language === language);
}

async function fetchActive(locale: string) {
  if (activeSurah.value == null || activeAyah.value == null) return;
  loading.value = true;
  error.value = false;
  data.value = null;
  try {
    data.value = await getVerseDetail(
      activeSurah.value,
      activeAyah.value,
      locale
    );
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function open(surah: number, ayah: number, locale: string) {
  activeSurah.value = surah;
  activeAyah.value = ayah;
  currentLocale.value = locale;
  isOpen.value = true;
  trackEvent("verse_panel_opened", { surah, ayah });
  await fetchActive(locale);
}

function close() {
  isOpen.value = false;
}

function retry(locale: string) {
  return fetchActive(locale);
}

const hasPrev = computed(
  () =>
    activeSurah.value != null &&
    activeAyah.value != null &&
    !(activeSurah.value === 1 && activeAyah.value === 1)
);
const hasNext = computed(
  () =>
    activeSurah.value != null &&
    activeAyah.value != null &&
    !(activeSurah.value === 114 && activeAyah.value === 6)
);

async function goPrev() {
  if (!hasPrev.value || activeSurah.value == null || activeAyah.value == null)
    return;
  if (activeAyah.value > 1) {
    activeAyah.value -= 1;
  } else {
    const prev = SURAHS.find((s) => s.number === activeSurah.value! - 1);
    if (!prev) return;
    activeSurah.value = prev.number;
    activeAyah.value = prev.verse_count;
  }
  await fetchActive(currentLocale.value);
}

async function goNext() {
  if (!hasNext.value || activeSurah.value == null || activeAyah.value == null)
    return;
  const cur = SURAHS.find((s) => s.number === activeSurah.value);
  if (cur && activeAyah.value < cur.verse_count) {
    activeAyah.value += 1;
  } else {
    const next = SURAHS.find((s) => s.number === activeSurah.value! + 1);
    if (!next) return;
    activeSurah.value = next.number;
    activeAyah.value = 1;
  }
  await fetchActive(currentLocale.value);
}

export function useVerseDetail() {
  return {
    isOpen,
    loading,
    error,
    data,
    activeSurah,
    activeAyah,
    selectedTafsirSlug,
    setSelectedTafsirSlug,
    selectedTafsirLanguage,
    setSelectedTafsirLanguage,
    availableTafsirLanguages,
    resolveTafsirLanguage,
    tafsirsForLanguage,
    open,
    close,
    retry,
    hasPrev,
    hasNext,
    goPrev,
    goNext,
  };
}
