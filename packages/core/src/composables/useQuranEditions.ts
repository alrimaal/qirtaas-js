import { computed, ref } from "vue";
import {
  getQuranResources,
  type QuranResource,
} from "@qirtaas/core/services/quran";
import {
  groupByLanguage,
  type ResourceGroup,
} from "@qirtaas/core/editor/quran/languageLabels";

const editions = ref<QuranResource[]>([]);
let requested = false;

/** Fetch the catalogue once per page. Safe to call from every picker's mount. */
async function loadEditions(): Promise<void> {
  if (requested) return;
  requested = true;
  try {
    editions.value = (await getQuranResources()).translations;
  } catch {
    // Let the next picker retry; callers render nothing until this succeeds.
    requested = false;
  }
}

// Shared grouping for the common case (English first). The locale-aware pickers
// build their own from `editions`.
const defaultGroups = computed<ResourceGroup[]>(() =>
  groupByLanguage(editions.value, ["english"])
);

export function useQuranEditions() {
  return { editions, loadEditions, defaultGroups };
}
