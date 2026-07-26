<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useI18n } from "vue-i18n";
import DOMPurify from "dompurify";
import { getHadithByRef } from "@qirtaas/core/services/hadith";

// Shows the English translation of a SINGLE hadith — no navigation.
const props = defineProps<{ slug: string; number: number }>();

const { t } = useI18n();

// Shared across every strip so re-toggling never refetches a hadith.
const cache = new Map<string, string>();

const translation = ref<string | null>(null);
const loading = ref(false);
const error = ref(false);

const sanitized = computed(() =>
  translation.value
    ? DOMPurify.sanitize(translation.value, {
        ALLOWED_TAGS: ["p", "br", "b", "i", "em", "strong", "sup", "sub", "span"],
        ALLOWED_ATTR: ["dir", "class"],
      })
    : ""
);

async function load() {
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

watch(() => [props.slug, props.number], load, { immediate: true });
</script>

<template>
  <span
    dir="ltr"
    contenteditable="false"
    class="block my-1.5 ps-3 pe-2 py-2 bg-bg-soft border-s-2 border-accent/60 rounded-e-md text-sm"
  >
    <span v-if="loading" class="block h-4 w-3/4 bg-border/40 rounded animate-pulse" />
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
    <span
      v-else-if="sanitized"
      class="block text-ink/90 leading-relaxed italic"
      v-html="sanitized"
    />
    <span v-else class="block text-muted italic">
      {{ t("hadithDetail.noTranslation") }}
    </span>
  </span>
</template>
