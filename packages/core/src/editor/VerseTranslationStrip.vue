<script lang="ts">
// Module scope on purpose. `<script setup>` compiles into setup(), so a cache
// declared there is per-instance — and since a card's Aa toggle is `v-if`, the
// strip is destroyed on collapse and the cache would die with it, refetching on
// every re-open. This block runs once per module, so all strips share it.
// Keyed by edition too: without that, switching edition serves stale text.
// Values are just the translation string, so it stays small.
const cache = new Map<string, string>();

/** Seed the cache from text already in hand (e.g. search results). */
export function primeVerseTranslation(
  edition: number,
  surah: number,
  ayah: number,
  text: string
) {
  cache.set(`${edition}:${surah}:${ayah}`, text);
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { getVerseDetail } from "@qirtaas/core/services/quran";
import { useTranslationEdition } from "@qirtaas/core/composables/useTranslationEdition";
import { useQuranEditions } from "@qirtaas/core/composables/useQuranEditions";
import { languageDir } from "./quran/languageLabels";
import SanitizedHtml from "./SanitizedHtml.vue";

// Shows the translation of a SINGLE verse — no navigation, no switching.
const props = defineProps<{
  surah: number;
  ayah: number;
  /** Drop the strip's own border and background (inside a panel). */
  bare?: boolean;
}>();

const { t } = useI18n();
const { selectedTranslationId } = useTranslationEdition();
const { editions } = useQuranEditions();

const dir = computed(() =>
  languageDir(
    editions.value.find((r) => r.resource_id === selectedTranslationId.value)
      ?.language
  )
);

// Guards against an out-of-order reply: switching edition while a fetch is in
// flight means a slow response for the OLD edition can land after the new one
// and repaint stale text. Same pattern as QuranReference's lookupId.
let requestId = 0;

const translation = ref<string | null>(null);
const loading = ref(false);
const error = ref(false);

// Readiness signal for the PDF renderer: exposed as data-state on the wrapper
// (see RendererInstance.isRenderSettled). "failed" counts as settled so a
// broken fetch can never block the export.
const state = computed(() =>
  loading.value ? "loading" : error.value ? "failed" : "loaded"
);

async function load() {
  const edition = selectedTranslationId.value;
  const key = `${edition}:${props.surah}:${props.ayah}`;
  const cached = cache.get(key);
  if (cached != null) {
    requestId += 1; // supersede any in-flight fetch
    translation.value = cached;
    error.value = false;
    loading.value = false;
    return;
  }
  const id = ++requestId;
  loading.value = true;
  error.value = false;
  translation.value = null;
  try {
    const detail = await getVerseDetail(props.surah, props.ayah, edition);
    // Cache regardless of staleness — the key names the edition it belongs to.
    cache.set(key, detail.translation_en);
    if (id !== requestId) return;
    translation.value = detail.translation_en;
  } catch {
    if (id !== requestId) return;
    error.value = true;
  } finally {
    if (id === requestId) loading.value = false;
  }
}

watch(
  () => [props.surah, props.ayah, selectedTranslationId.value],
  load,
  { immediate: true }
);
</script>

<template>
  <span
    :dir="dir"
    contenteditable="false"
    data-async-content
    :data-state="state"
    class="block text-sm"
    :class="
      bare
        ? ''
        : 'my-1.5 ps-3 pe-2 py-2 bg-bg-soft border-s-2 border-accent/60 rounded-e-md'
    "
  >
    <span v-if="loading" class="block h-4 w-3/4 bg-border/40 rounded animate-pulse" />
    <span v-else-if="error" class="flex items-center gap-2 text-muted">
      {{ t("verseDetail.error") }}
      <button
        type="button"
        class="text-accent hover:underline cursor-pointer"
        @click="load"
      >
        {{ t("verseDetail.retry") }}
      </button>
    </span>
    <SanitizedHtml
      v-else
      policy="inline"
      :html="translation"
      class="block text-ink/90 leading-relaxed italic"
    />
  </span>
</template>
