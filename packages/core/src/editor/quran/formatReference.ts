// Single source of truth for verse/hadith reference labels. RTL locales get the
// Arabic name with Arabic-Indic digits ("آل عمران ٦-٨"); others get the English
// name ("Ali 'Imran 3:6-8"). Render labels in <bdi :dir="labelDir(locale)">.

import { SURAHS } from "../../data/mushaf";

export interface VerseRefAttrs {
  surah: number;
  surahNameArabic?: string;
  surahNameEnglish?: string;
  ayah?: number;
  fromAyah?: number | null;
  toAyah?: number | null;
}

export interface HadithRefAttrs {
  collectionNameArabic: string;
  collectionNameEnglish: string;
  number: number | null;
}

export const isRtlLocale = (locale: string) => locale.startsWith("ar");

export const labelDir = (locale: string): "rtl" | "ltr" =>
  isRtlLocale(locale) ? "rtl" : "ltr";

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function localizeDigits(value: number | string, locale: string): string {
  const s = String(value);
  return isRtlLocale(locale)
    ? s.replace(/[0-9]/g, (d) => ARABIC_DIGITS[Number(d)]!)
    : s;
}

function ayahRange(attrs: VerseRefAttrs): string {
  const from = attrs.fromAyah ?? attrs.ayah ?? 0;
  const to = attrs.toAyah ?? attrs.ayah ?? from;
  return from === to ? `${from}` : `${from}-${to}`;
}

export function shortReference(attrs: VerseRefAttrs): string {
  return `${attrs.surah}:${ayahRange(attrs)}`;
}

/** RTL omits the surah number: "آل عمران ٦-٨" vs "Ali 'Imran 3:6-8". */
export function verseLabel(attrs: VerseRefAttrs, locale: string): string {
  const info = SURAHS[attrs.surah - 1];
  if (isRtlLocale(locale)) {
    const name = attrs.surahNameArabic || info?.name_arabic || "";
    return `${name} ${localizeDigits(ayahRange(attrs), locale)}`.trim();
  }
  const name = attrs.surahNameEnglish || info?.name_english || "";
  return `${name} ${shortReference(attrs)}`.trim();
}

export function hadithLabel(attrs: HadithRefAttrs, locale: string): string {
  const name = isRtlLocale(locale)
    ? attrs.collectionNameArabic || attrs.collectionNameEnglish
    : attrs.collectionNameEnglish || attrs.collectionNameArabic;
  if (attrs.number == null) return name;
  return `${name} ${localizeDigits(attrs.number, locale)}`;
}
