import { useI18n } from "vue-i18n";
import { useVerseDetail } from "@qirtaas/core/composables/useVerseDetail";
import { useHadithDetail } from "@qirtaas/core/composables/useHadithDetail";

/** Opens the study panel for a selected verse, hadith or mushaf node. */
export function useAtomDetail() {
  const { locale } = useI18n();
  const verseDetail = useVerseDetail();
  const hadithDetail = useHadithDetail();

  return function openAtomDetail(
    nodeType: string,
    attrs: Record<string, unknown>
  ) {
    if (nodeType === "quranVerse") {
      const surah = attrs.surah as number;
      const fromAyah =
        (attrs.fromAyah as number | null) ?? (attrs.ayah as number);
      verseDetail.open(surah, fromAyah, locale.value);
    } else if (nodeType === "hadithNode") {
      hadithDetail.open(
        attrs.collectionNameEnglish as string,
        attrs.number as number
      );
    } else if (nodeType === "quranMushaf") {
      const from = attrs.from as { surah: number; ayah: number } | null;
      if (!from) return;
      verseDetail.open(from.surah, from.ayah, locale.value);
    }
  };
}
