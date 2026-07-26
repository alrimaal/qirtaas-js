<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { getVerseDetail } from "@qirtaas/core/services/quran";

// Shows the translation of a SINGLE verse — no navigation, no switching.
const props = defineProps<{ surah: number; ayah: number }>();

const { t, locale } = useI18n();

// Shared across every strip so re-toggling never refetches a verse.
const cache = new Map<string, string>();

const translation = ref<string | null>(null);
const loading = ref(false);
const error = ref(false);

async function load() {
  const key = `${props.surah}:${props.ayah}`;
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
    const detail = await getVerseDetail(props.surah, props.ayah, locale.value);
    cache.set(key, detail.translation_en);
    translation.value = detail.translation_en;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

watch(() => [props.surah, props.ayah], load, { immediate: true });
</script>

<template>
  <span
    dir="ltr"
    contenteditable="false"
    class="block my-1.5 ps-3 pe-2 py-2 bg-bg-soft border-s-2 border-accent/60 rounded-e-md text-sm"
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
    <span v-else class="block text-ink/90 leading-relaxed italic">
      {{ translation }}
    </span>
  </span>
</template>
