import { ref } from "vue";

/** M.A.S. Abdel Haleem — the edition the backend serves when none is named. */
export const DEFAULT_TRANSLATION_ID = 85;

/** Fallback for Arabic-locale readers with no stored choice. */
export const ARABIC_TRANSLATION_ID = 1014;

const STORAGE_KEY = "quran.selectedTranslationId";

function readStored(): number {
  if (typeof localStorage === "undefined") return DEFAULT_TRANSLATION_ID;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const id = raw == null ? NaN : Number(raw);
    if (Number.isInteger(id) && id > 0) return id;
    return localStorage.getItem("locale") === "ar"
      ? ARABIC_TRANSLATION_ID
      : DEFAULT_TRANSLATION_ID;
  } catch {
    return DEFAULT_TRANSLATION_ID;
  }
}

// Module-level singleton — every picker and every strip reads this one ref.
const selectedTranslationId = ref<number>(readStored());

/** Persisted choice. Both the sidebar picker and the verse panel call this. */
export function setSelectedTranslationId(id: number) {
  if (!Number.isInteger(id) || id <= 0) return;
  selectedTranslationId.value = id;
  try {
    localStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    /* ignore — private windows */
  }
}

/**
 * Set translation without persistence. Useful for headless browser PDF export
 */
export function seedTranslationId(id: number) {
  if (!Number.isInteger(id) || id <= 0) return;
  selectedTranslationId.value = id;
}

export function useTranslationEdition() {
  return { selectedTranslationId, setSelectedTranslationId };
}
