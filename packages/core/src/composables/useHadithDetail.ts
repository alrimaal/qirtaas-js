import { ref } from "vue";
import {
  getHadithByRef,
  type HadithResult,
} from "@qirtaas/core/services/hadith";
import { trackEvent } from "@qirtaas/core/editor/runtime/analytics";

// Module-level state — shared across all consumers (singleton).
const isOpen = ref(false);
const loading = ref(false);
const error = ref(false);
const data = ref<HadithResult | null>(null);
const activeSlug = ref<string | null>(null);
const activeNumber = ref<number | null>(null);

async function fetchActive() {
  if (!activeSlug.value || activeNumber.value == null) return;
  loading.value = true;
  error.value = false;
  data.value = null;
  try {
    const hadiths = await getHadithByRef(activeSlug.value, activeNumber.value);
    data.value = hadiths[0] ?? null;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function open(slug: string, number: number) {
  activeSlug.value = slug;
  activeNumber.value = number;
  isOpen.value = true;
  trackEvent("hadith_panel_opened", { slug, number });
  await fetchActive();
}

function close() {
  isOpen.value = false;
}

function retry() {
  return fetchActive();
}

export function useHadithDetail() {
  return {
    isOpen,
    loading,
    error,
    data,
    activeSlug,
    activeNumber,
    open,
    close,
    retry,
  };
}
