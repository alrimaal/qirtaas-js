<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import { trackEvent } from "./runtime/analytics";

// Copies the translation only — never the Arabic text or tafsir.
const props = defineProps<{
  source: () => HTMLElement | null | undefined;
  event: string;
  params: Record<string, unknown>;
}>();

const { t } = useI18n();
const copied = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

async function copy() {
  const text = props.source()?.innerText.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    return;
  }
  trackEvent(props.event, props.params);
  copied.value = true;
  clearTimeout(timer);
  timer = setTimeout(() => (copied.value = false), 1500);
}

onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <button
    type="button"
    data-screen-only
    class="copy-translation inline-flex items-center justify-center size-6 rounded-md text-muted hover:text-accent hover:bg-accent/10 cursor-pointer select-none transition-[color,background-color,opacity]"
    :class="{ '!text-accent !opacity-100': copied }"
    :title="copied ? t('editor.atom.translationCopied') : t('editor.atom.copyTranslation')"
    :aria-label="t('editor.atom.copyTranslation')"
    @mousedown.stop.prevent
    @click.stop="copy"
  >
    <i
      class="pi text-[0.7rem]"
      :class="copied ? 'pi-check' : 'pi-copy'"
    />
    <span class="sr-only" aria-live="polite">{{
      copied ? t("editor.atom.translationCopied") : ""
    }}</span>
  </button>
</template>
