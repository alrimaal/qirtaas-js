<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import DOMPurify from "dompurify";
import Button from "primevue/button";
import { useHadithDetail } from "@qirtaas/core/composables/useHadithDetail";
import ReportDataDialog from "./ReportDataDialog.vue";

function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "b", "i", "em", "strong", "sup", "sub",
      "span", "div", "h1", "h2", "h3", "h4", "ol", "ul", "li",
    ],
    ALLOWED_ATTR: ["dir", "class"],
  });
}

const { t, locale } = useI18n();
const {
  isOpen,
  loading,
  error,
  data,
  activeSlug,
  activeNumber,
  close,
  retry,
} = useHadithDetail();

const sunnahUrl = computed(() => {
  if (!activeSlug.value || activeNumber.value == null) return "#";
  return `https://sunnah.com/${activeSlug.value}:${activeNumber.value}`;
});

const collectionName = computed(() => {
  if (!data.value) return "";
  return locale.value === "ar"
    ? data.value.collection_name_arabic
    : data.value.collection_name_english;
});

const babName = computed(() => {
  if (!data.value) return "";
  return locale.value === "ar"
    ? data.value.arabic_bab_name
    : data.value.english_bab_name;
});

const grade = computed(() => {
  if (!data.value) return "";
  return locale.value === "ar"
    ? data.value.grade
    : data.value.english_grade;
});

const reportOpen = ref(false);
const hadithReference = computed(
  () => `${activeSlug.value ?? ""}:${activeNumber.value ?? ""}`,
);

const headerRef = computed(() => {
  if (data.value) {
    const name = collectionName.value;
    return data.value.number != null ? `${name} · #${data.value.number}` : name;
  }
  if (activeSlug.value && activeNumber.value != null) {
    return `${activeSlug.value}:${activeNumber.value}`;
  }
  return "";
});

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && isOpen.value) close();
}
</script>

<template>
  <aside
    :aria-label="t('hadithDetail.ariaLabel')"
    class="flex flex-col h-full bg-bg-soft border-s border-border overflow-hidden"
    @keydown="onKeydown"
  >
    <!-- Header -->
    <header
      class="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border bg-bg"
    >
      <i class="pi pi-book text-accent text-sm shrink-0" />
      <div class="flex-1 min-w-0 text-sm font-semibold text-primary truncate">
        {{ headerRef }}
      </div>
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
        :href="sunnahUrl"
        target="_blank"
        rel="noopener noreferrer"
        icon="pi pi-external-link"
        severity="secondary"
        text
        rounded
        size="small"
        :aria-label="t('hadithDetail.openOnSunnah')"
      />
      <Button
        icon="pi pi-times"
        severity="secondary"
        text
        rounded
        size="small"
        :aria-label="t('hadithDetail.close')"
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
        <p class="text-sm text-muted">{{ t("hadithDetail.error") }}</p>
        <Button
          :label="t('hadithDetail.retry')"
          icon="pi pi-refresh"
          size="small"
          severity="secondary"
          outlined
          @click="retry()"
        />
      </div>

      <!-- Content -->
      <template v-else-if="data">
        <!-- Hero: Arabic text -->
        <section
          dir="rtl"
          class="px-5 py-6 bg-gradient-to-b from-accent/5 to-transparent border-b border-border"
        >
          <p
            class="text-xl leading-[2.4] text-primary text-center"
            v-html="sanitize(data.text)"
          />
        </section>

        <div class="px-5 py-5 space-y-5">
          <!-- Collection name -->
          <section class="space-y-1">
            <h3
              class="text-[0.7rem] font-semibold uppercase tracking-wider text-muted"
            >
              {{ t("hadithDetail.collection") }}
            </h3>
            <p class="text-sm text-ink" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
              {{ collectionName }}
            </p>
          </section>

          <!-- Book (bab) name -->
          <section v-if="babName" class="space-y-1">
            <h3
              class="text-[0.7rem] font-semibold uppercase tracking-wider text-muted"
            >
              {{ t("hadithDetail.book") }}
            </h3>
            <p class="text-sm text-ink" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
              {{ babName }}
            </p>
          </section>

          <!-- Grade -->
          <section v-if="grade" class="space-y-1">
            <h3
              class="text-[0.7rem] font-semibold uppercase tracking-wider text-muted"
            >
              {{ t("hadithDetail.grade") }}
            </h3>
            <span
              class="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full bg-accent/10 text-accent"
            >
              {{ grade }}
            </span>
          </section>

          <!-- Translation -->
          <section
            v-if="data.translation_en && locale !== 'ar'"
            class="space-y-1"
          >
            <h3
              class="text-[0.7rem] font-semibold uppercase tracking-wider text-muted"
            >
              {{ t("hadithDetail.translation") }}
            </h3>
            <div
              class="text-sm text-ink leading-relaxed"
              v-html="sanitize(data.translation_en)"
            />
          </section>
        </div>
      </template>
    </div>

    <ReportDataDialog
      v-model:visible="reportOpen"
      kind="hadith"
      :reference="hadithReference"
    />
  </aside>
</template>
