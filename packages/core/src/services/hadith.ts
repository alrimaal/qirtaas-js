import { getTransport } from "./transport";

export interface HadithResult {
  id: number;
  slug: string;
  collection_name_arabic: string;
  collection_name_english: string;
  number: number | null;
  text: string;
  translation_en: string;
  narrator_chain: string;
  grade: string;
  arabic_bab_name: string;
  english_bab_name: string;
  english_grade: string;
  /** Trimmed excerpt with matched words wrapped in <mark>; null for ref lookups. */
  text_highlighted?: string | null;
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
