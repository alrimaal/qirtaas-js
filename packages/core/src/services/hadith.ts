import { getTransport } from "./transport";

export interface HadithResult {
  id: number;
  slug: string;
  collection_name_arabic: string;
  collection_name_english: string;
  number: number | null;
  text: string;
  /**
   * The hadith body alone, without the isnad. Empty string when the source
   * carries no markup or its markup was malformed — roughly a third of the
   * corpus — so always fall back to `text`.
   */
  matn: string;
  translation_en: string;
  /** The isnad alone. Empty under the same conditions as `matn`. */
  narrator_chain: string;
  grade: string;
  arabic_bab_name: string;
  english_bab_name: string;
  english_grade: string;
  /** Trimmed excerpt with matched words wrapped in <mark>; null for ref lookups. */
  text_highlighted?: string | null;
  /** Same as `text_highlighted`, over the translation, for English queries. */
  translation_highlighted?: string | null;
}

export async function searchHadith(query: string): Promise<HadithResult[]> {
  const isRef = /^.+:\d+$/.test(query.trim());
  const params = isRef ? { ref: query.trim() } : { q: query.trim() };
  const data = await getTransport().content.get<HadithResult | HadithResult[]>(
    "/hadith/search/",
    { params }
  );

  return data as HadithResult[];
}

export async function getHadithByRef(
  slug: string,
  number: number
): Promise<HadithResult[]> {
  return await getTransport().content.get<HadithResult[]>("/hadith/search/", {
    params: { ref: `${slug}:${number}` },
  });
}
