<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Button from "primevue/button";
import {
  useVerseDetail,
  localeToTafsirLanguage,
} from "@qirtaas/core/composables/useVerseDetail";
import { useQuranEditions } from "@qirtaas/core/composables/useQuranEditions";
import { languageLabel } from "./quran/languageLabels";
import TranslationEditionSelect from "./quran/TranslationEditionSelect.vue";
import ReportDataDialog from "./ReportDataDialog.vue";
import SanitizedHtml from "./SanitizedHtml.vue";

const { t, locale } = useI18n();
const {
  isOpen,
  loading,
  error,
  data,
  activeSurah,
  activeAyah,
  selectedTafsirSlug,
  setSelectedTafsirSlug,
  setSelectedTafsirLanguage,
  availableTafsirLanguages,
  resolveTafsirLanguage,
  tafsirsForLanguage,
  close,
  retry,
  hasPrev,
  hasNext,
  goPrev,
  goNext,
} = useVerseDetail();

const quranComUrl = computed(
  () => `https://quran.com/${activeSurah.value}:${activeAyah.value}`
);

const reportOpen = ref(false);
const verseReference = computed(
  () => `${activeSurah.value ?? ""}:${activeAyah.value ?? ""}`
);

const languageOptions = computed(() => {
  // The UI-locale's language leads, then the other two "core" languages, so a
  // French reader sees Français first, then العربية / English. Deduped, so a
  // locale that already maps to arabic/english doesn't repeat.
  const priority = [
    ...new Set([localeToTafsirLanguage(locale.value), "arabic", "english"]),
  ];

  const sorted = [...availableTafsirLanguages.value].sort((a, b) => {
    const ai = priority.indexOf(a);
    const bi = priority.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  return sorted.map((lang) => ({ value: lang, label: languageLabel(lang) }));
});

const { editions: translationEditions, loadEditions } = useQuranEditions();
onMounted(loadEditions);

/** The edition actually on screen, per the response. Never a guess: while the
 *  catalogue is still loading this is all we can honestly name. */
const servedEditionName = computed(() => data.value?.translation?.name ?? "");

const activeLanguage = computed<string | null>({
  get() {
    return resolveTafsirLanguage(locale.value);
  },
  set(lang: string | null) {
    if (lang) setSelectedTafsirLanguage(lang);
  },
});

const tafsirsInActiveLanguage = computed(() =>
  tafsirsForLanguage(activeLanguage.value)
);

const activeTafsirSlug = computed<string | null>({
  get() {
    const tafsirs = tafsirsInActiveLanguage.value;
    if (tafsirs.length === 0) return null;
    const stored = selectedTafsirSlug.value;
    if (stored && tafsirs.some((tf) => tf.slug === stored)) return stored;
    return tafsirs[0]!.slug;
  },
  set(slug: string | null) {
    if (slug) setSelectedTafsirSlug(slug);
  },
});

const activeTafsir = computed(
  () =>
    tafsirsInActiveLanguage.value.find(
      (tf) => tf.slug === activeTafsirSlug.value
    ) ?? null
);

// When the active language changes, make sure the selected slug is valid in the new list.
watch(tafsirsInActiveLanguage, (tafsirs) => {
  if (!tafsirs || tafsirs.length === 0) return;
  const stored = selectedTafsirSlug.value;
  if (!stored || !tafsirs.some((tf) => tf.slug === stored)) {
    setSelectedTafsirSlug(tafsirs[0]!.slug);
  }
});

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && isOpen.value) close();
}
</script>

<template>
  <aside
    :aria-label="t('verseDetail.ariaLabel')"
    class="flex flex-col h-full bg-bg-soft border-s border-border overflow-hidden"
    @keydown="onKeydown"
  >
    <!-- Header — px-4 py-2 mirrors main editor header so heights align -->
    <header
      class="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border bg-bg"
    >
      <i class="pi pi-book text-accent text-sm shrink-0" />
      <div class="flex-1 min-w-0 text-sm font-semibold text-primary truncate">
        <template v-if="data">
          {{ data.surah_name_english }}
          <span class="text-muted font-normal">
            · {{ data.surah }}:{{ data.ayah }}
          </span>
        </template>
        <template v-else-if="activeSurah && activeAyah">
          {{ activeSurah }}:{{ activeAyah }}
        </template>
      </div>
      <Button
        v-if="hasPrev || hasNext"
        icon="pi pi-chevron-left"
        severity="secondary"
        text
        rounded
        size="small"
        :disabled="!hasPrev"
        :aria-label="t('verseDetail.prev')"
        class="[html[dir=rtl]_&]:rotate-180"
        @click="goPrev"
      />
      <Button
        v-if="hasPrev || hasNext"
        icon="pi pi-chevron-right"
        severity="secondary"
        text
        rounded
        size="small"
        :disabled="!hasNext"
        :aria-label="t('verseDetail.next')"
        class="[html[dir=rtl]_&]:rotate-180"
        @click="goNext"
      />
      <Button
        v-if="data"
        v-tooltip.bottom="t('reportData.tooltip')"
        icon="pi pi-flag"
        severity="secondary"
        text
        rounded
        size="small"
        :aria-label="t('reportData.tooltip')"
        @click="reportOpen = true"
      />
      <Button
        as="a"
        :href="quranComUrl"
        target="_blank"
        rel="noopener noreferrer"
        icon="pi pi-external-link"
        severity="secondary"
        text
        rounded
        size="small"
        :aria-label="t('verseDetail.openOnQuranCom')"
      />
      <Button
        icon="pi pi-times"
        severity="secondary"
        text
        rounded
        size="small"
        :aria-label="t('verseDetail.close')"
        @click="close"
      />
    </header>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto">
      <!-- Loading -->
      <div v-if="loading" class="p-5 space-y-4 animate-pulse">
        <div class="h-20 bg-border/40 rounded-lg" />
        <div class="space-y-2">
          <div class="h-3 bg-border/40 rounded w-1/4" />
          <div class="h-4 bg-border/40 rounded w-full" />
          <div class="h-4 bg-border/40 rounded w-5/6" />
        </div>
        <div class="space-y-2">
          <div class="h-3 bg-border/40 rounded w-1/4" />
          <div class="h-4 bg-border/40 rounded w-full" />
          <div class="h-4 bg-border/40 rounded w-2/3" />
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-12 px-5 space-y-3">
        <i class="pi pi-exclamation-triangle text-3xl text-muted/70" />
        <p class="text-sm text-muted">{{ t("verseDetail.error") }}</p>
        <Button
          :label="t('verseDetail.retry')"
          icon="pi pi-refresh"
          size="small"
          severity="secondary"
          outlined
          @click="retry(locale)"
        />
      </div>

      <!-- Content -->
      <template v-else-if="data">
        <!-- Hero: Arabic verse on tinted background -->
        <section
          dir="rtl"
          class="px-5 py-6 bg-gradient-to-b from-accent/5 to-transparent border-b border-border"
        >
          <p class="text-2xl leading-[2.4] text-primary text-center font-quran">
            {{ data.arabic_text }}
          </p>
        </section>

        <div class="px-5 py-5 space-y-6">
          <section v-if="locale !== 'ar'" class="space-y-2">
            <div class="flex items-baseline justify-between gap-2">
              <h3
                class="text-[0.7rem] font-semibold uppercase tracking-wider text-muted shrink-0"
              >
                {{ t("verseDetail.translation") }}
              </h3>
              <!-- Searchable edition picker, grouped by language: 144 editions
                   is far too many to scroll blind. -->
              <TranslationEditionSelect
                v-if="translationEditions.length > 0"
                variant="field"
                priority="locale"
              />
              <span
                v-else-if="servedEditionName"
                class="text-[0.65rem] text-muted/80 italic truncate"
              >
                {{ servedEditionName }}
              </span>
            </div>
            <SanitizedHtml
              v-if="data.translation_en"
              :html="data.translation_en"
              class="text-sm text-ink leading-relaxed"
            />
            <p v-else class="text-sm text-muted italic">
              {{ t("verseDetail.noTranslation") }}
            </p>
          </section>

          <!-- Tafsir -->
          <section v-if="data.tafsirs.length > 0" class="space-y-3">
            <div class="flex items-center justify-between gap-2">
              <h3
                class="text-[0.7rem] font-semibold uppercase tracking-wider text-muted"
              >
                {{ t("verseDetail.tafsir") }}
              </h3>
              <!-- Native <select>: no PrimeVue/runtime-injected CSS, so it can't
                   be left unstyled by the host the editor embeds into. -->
              <select
                v-if="availableTafsirLanguages.length > 1"
                v-model="activeLanguage"
                :aria-label="t('verseDetail.tafsirLanguage')"
                class="text-xs border border-border rounded-md bg-bg text-ink ps-2 pe-1 py-1 cursor-pointer hover:border-accent/50 focus:border-accent outline-none transition-colors"
              >
                <option
                  v-for="o in languageOptions"
                  :key="o.value"
                  :value="o.value"
                >
                  {{ o.label }}
                </option>
              </select>
            </div>

            <div
              v-if="tafsirsInActiveLanguage.length > 1"
              class="flex flex-wrap gap-1.5"
            >
              <button
                v-for="tf in tafsirsInActiveLanguage"
                :key="tf.slug"
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-full border cursor-pointer transition-colors"
                :class="
                  activeTafsirSlug === tf.slug
                    ? 'bg-primary text-white! border-primary'
                    : 'bg-transparent text-muted border-border hover:text-accent hover:border-accent/50'
                "
                @click="activeTafsirSlug = tf.slug"
              >
                {{ tf.name }}
              </button>
            </div>

            <div
              v-if="activeTafsir"
              :dir="activeTafsir.language === 'arabic' ? 'rtl' : 'ltr'"
              class="rounded-lg bg-bg border border-border p-4"
            >
              <SanitizedHtml
                :html="activeTafsir.text"
                class="text-sm text-ink leading-relaxed whitespace-pre-line"
              />
            </div>
          </section>
        </div>
      </template>
    </div>

    <ReportDataDialog
      v-model:visible="reportOpen"
      kind="quran"
      :reference="verseReference"
    />
  </aside>
</template>
