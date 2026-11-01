import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  hadithLabel,
  labelDir,
  localizeDigits,
  verseLabel,
  type HadithRefAttrs,
  type VerseRefAttrs,
} from "../editor/quran/formatReference";

/** Locale-bound reference labels; see formatReference.ts. */
export function useReferenceLabel() {
  const { locale } = useI18n();
  return {
    dir: computed(() => labelDir(locale.value)),
    verseLabel: (attrs: VerseRefAttrs) => verseLabel(attrs, locale.value),
    hadithLabel: (attrs: HadithRefAttrs) => hadithLabel(attrs, locale.value),
    digits: (value: number | string) => localizeDigits(value, locale.value),
  };
}
