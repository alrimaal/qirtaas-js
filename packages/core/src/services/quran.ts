import { getTransport } from "./transport";

export interface SurahBrief {
  number: number;
  name_arabic: string;
  name_english: string;
}

export interface AyahResult {
  surah: SurahBrief;
  number: number;
  text: string;
  translation?: string;
}

export interface VerseTafsir {
  slug: string;
  name: string;
  language: string;
  text: string;
}

/** One translation edition's metadata, plus its text for the verse at hand. */
export interface VerseTranslation {
  resource_id: number;
  name: string;
  author_name: string;
  language: string;
  slug: string;
  text: string;
}

export interface VerseDetail {
  surah: number;
  ayah: number;
  surah_name_arabic: string;
  surah_name_english: string;
  arabic_text: string;
  translation_en: string;
  /** The requested edition. `translation_en` is the same text, minus the metadata. */
  translation: VerseTranslation | null;
  tafsirs: VerseTafsir[];
}

// Raw backend response shape (keeps us honest about what /quran/verses returns).
interface VerseDetailResponse {
  surah: SurahBrief;
  number: number;
  text: string;
  // Legacy pair, still served; phase 3 drops them for `translation`/`tafsirs`.
  translation_en: string;
  tafseer: Record<string, VerseTafsir>;
  translation?: VerseTranslation;
  tafsirs?: VerseTafsir[];
}

/**
 * Arabic-Indic (٠-٩) and Persian (۰-۹) digits → ASCII, so verse references
 * typed on an Arabic keyboard parse like their Latin-numeral equivalents.
 */
export function toLatinDigits(input: string): string {
  return input.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code - (code >= 0x06f0 ? 0x06f0 : 0x0660));
  });
}

export async function getVerseDetail(
  surah: number,
  ayah: number,
  translationId?: number
): Promise<VerseDetail> {
  const raw = await getTransport().content.get<VerseDetailResponse>(
    `/quran/verses/${surah}:${ayah}/`,
    translationId ? { params: { translation: translationId } } : undefined
  );
  return {
    surah: raw.surah.number,
    ayah: raw.number,
    surah_name_arabic: raw.surah.name_arabic,
    surah_name_english: raw.surah.name_english,
    arabic_text: raw.text,
    translation_en: raw.translation_en,
    translation: raw.translation ?? null,
    tafsirs: raw.tafsirs ?? Object.values(raw.tafseer ?? {}),
  };
}

/** A translation or tafsir edition, metadata only — never content. */
export interface QuranResource {
  resource_id: number;
  name: string;
  author_name: string;
  language: string;
  slug: string;
}

export interface QuranResources {
  translations: QuranResource[];
  tafsirs: QuranResource[];
}

// ~170 rows that change only when the sync worker picks up a new edition, so
// one in-flight/resolved promise is shared by every picker on the page.
let resourcesPromise: Promise<QuranResources> | null = null;

/** Every edition the backend holds, for the edition pickers. */
export function getQuranResources(): Promise<QuranResources> {
  if (!resourcesPromise) {
    resourcesPromise = getTransport()
      .content.get<QuranResources>("/quran/resources/")
      .then((data) => ({
        translations: data.translations ?? [],
        tafsirs: data.tafsirs ?? [],
      }))
      .catch((err) => {
        // Don't cache a failure — the next picker that opens should retry.
        resourcesPromise = null;
        throw err;
      });
  }
  return resourcesPromise;
}

export interface SurahMatch {
  number: number;
  name_arabic: string;
  name_english: string;
  verse_count: number;
}

export interface QuranSearchResponse {
  surahs: SurahMatch[];
  verses: AyahResult[];
}

export async function searchQuran(
  query: string,
  translationId?: number
): Promise<QuranSearchResponse> {
  const trimmed = query.trim();
  const isVerse = /^\d+:\d+$/.test(trimmed);
  const params: Record<string, string | number> = isVerse
    ? { verse: trimmed }
    : { q: trimmed };
  if (translationId) params.translation = translationId;
  const data = await getTransport().content.get<
    QuranSearchResponse | AyahResult
  >("/quran/search/", { params });
  if (isVerse) {
    // Verse-lookup endpoint returns a single AyahResult; normalize to the
    // unified response shape so callers don't branch on input.
    return { surahs: [], verses: [data as AyahResult] };
  }
  return data as QuranSearchResponse;
}

export {
  SURAHS,
  MUSHAF_PAGES,
  type SurahInfo,
  type MushafPage,
  type VerseRef,
} from "@qirtaas/core/data/mushaf";

export interface VerseRangeResult {
  surah: SurahBrief;
  from_ayah: number;
  to_ayah: number;
  text: string;
}

export async function getVerseRange(
  surah: number,
  fromAyah: number,
  toAyah: number
): Promise<VerseRangeResult> {
  if (fromAyah === toAyah) {
    // Backend's range endpoint rejects from == to; the single-verse endpoint
    // is the documented path for this case.
    const raw = await getTransport().content.get<VerseDetailResponse>(
      `/quran/verses/${surah}:${fromAyah}/`
    );
    return {
      surah: raw.surah,
      from_ayah: raw.number,
      to_ayah: raw.number,
      text: raw.text,
    };
  }
  return await getTransport().content.get<VerseRangeResult>(
    "/quran/verses/range/",
    { params: { from: `${surah}:${fromAyah}`, to: `${surah}:${toAyah}` } }
  );
}

// A Quran.com collection summary. The fetchers + OAuth re-auth that populate
// these are host-owned (see QuranCollectionsHost in editor/runtime/context) and
// live in the SPA, so they don't ship in the core bundle.
export interface QuranCollection {
  id: string;
  name: string;
  // Verse count, when QF reports one for the collection — otherwise null.
  count: number | null;
}

function pad3(n: number): string {
  return n.toString().padStart(3, "0");
}

export function mushafSvgUrl(page: number): string {
  return `${getTransport().content.apiUrl}/quran/pages/${pad3(page)}.svg`;
}

export interface ClipRef {
  page: number;
  lineStart: number;
  lineEnd: number;
}

export function mushafClipUrl(ref: ClipRef): string {
  const params = new URLSearchParams({
    page: String(ref.page),
    line_start: String(ref.lineStart),
    line_end: String(ref.lineEnd),
  });
  return `${
    getTransport().content.apiUrl
  }/quran/clips.png?${params.toString()}`;
}
