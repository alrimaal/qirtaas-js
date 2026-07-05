// Single source of truth for verse-reference labels across the editor,
// detail panel, and post-preview UIs. Handles single verses, slices, and ranges.

export interface VerseRefAttrs {
  surah: number;
  surahNameArabic: string;
  surahNameEnglish?: string;
  ayah?: number;
  fromAyah?: number | null;
  toAyah?: number | null;
  fromWord?: number | null;
  toWord?: number | null;
}

export function formatReference(attrs: VerseRefAttrs): string {
  const from = attrs.fromAyah ?? attrs.ayah ?? 0;
  const to = attrs.toAyah ?? attrs.ayah ?? from;
  if (from === to) {
    const slice =
      attrs.fromWord != null && attrs.toWord != null
        ? ` (${attrs.fromWord + 1}-${attrs.toWord + 1})`
        : "";
    return `${attrs.surahNameArabic} ${attrs.surah}:${from}${slice}`;
  }
  return `${attrs.surahNameArabic} ${attrs.surah}:${from}-${to}`;
}

export function shortReference(attrs: VerseRefAttrs): string {
  const from = attrs.fromAyah ?? attrs.ayah ?? 0;
  const to = attrs.toAyah ?? attrs.ayah ?? from;
  return from === to
    ? `${attrs.surah}:${from}`
    : `${attrs.surah}:${from}-${to}`;
}
