<script lang="ts">
// Module scope so every strip shares it and re-toggling never refetches.
const cache = new Map<string, string>();
</script>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useI18n } from "vue-i18n";
import { getHadithByRef } from "@qirtaas/core/services/hadith";
import SanitizedHtml from "./SanitizedHtml.vue";

// Shows the English translation of a SINGLE hadith — no navigation.
const props = defineProps<{
  slug: string;
  number: number | null;
  text?: string;
  /** Drop the strip's own border and background (inside a panel). */
  bare?: boolean;
}>();

const { t } = useI18n();

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
  if (props.text !== undefined || props.number == null) {
    translation.value = props.text ?? "";
    error.value = false;
    loading.value = false;
    return;
  }
  const key = `${props.slug}:${props.number}`;
  const cached = cache.get(key);
  if (cached != null) {
    translation.value = cached;
    error.value = false;
    return;
  }
  loading.value = true;
  error.value = false;
  translation.value = null;
  try {
    const hadiths = await getHadithByRef(props.slug, props.number);
    const text = hadiths[0]?.translation_en ?? "";
    cache.set(key, text);
    translation.value = text;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

watch(() => [props.slug, props.number, props.text], load, { immediate: true });
</script>

<template>
  <span
    dir="ltr"
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
    <span
      v-if="loading"
      class="block h-4 w-3/4 bg-border/40 rounded animate-pulse"
    />
    <span v-else-if="error" class="flex items-center gap-2 text-muted">
      {{ t("hadithDetail.error") }}
      <button
        type="button"
        class="text-accent hover:underline cursor-pointer"
        @click="load"
      >
        {{ t("hadithDetail.retry") }}
      </button>
    </span>
    <SanitizedHtml
      v-else-if="translation"
      policy="inline"
      :html="translation"
      class="block text-ink/90 leading-relaxed italic"
    />
    <span v-else class="block text-muted italic">
      {{ t("hadithDetail.noTranslation") }}
    </span>
  </span>
</template>
