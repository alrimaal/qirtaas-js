import type { QuranResource } from "@qirtaas/core/services/quran";

// Native-script labels so each language is self-descriptive regardless of UI
// locale. The backend names languages in English ("urdu", "arabic"); anything
// unmapped is title-cased, which is why the long tail reads "Central khmer".
const LANGUAGE_LABELS: Record<string, string> = {
  arabic: "العربية",
  english: "English",
  urdu: "اردو",
  french: "Français",
  spanish: "Español",
  indonesian: "Bahasa Indonesia",
  turkish: "Türkçe",
  russian: "Русский",
  bengali: "বাংলা",
  chinese: "中文",
};

export function languageLabel(lang: string): string {
  return LANGUAGE_LABELS[lang] ?? lang.charAt(0).toUpperCase() + lang.slice(1);
}

/**
 * An edition row carrying its own language label, so a picker's search can
 * match "urdu", "اردو" and the edition/author name from one flat field list.
 */
export interface EditionOption extends QuranResource {
  languageLabel: string;
}

export interface ResourceGroup {
  language: string;
  label: string;
  resources: EditionOption[];
}

/**
 * Editions bucketed by language for a grouped picker. `priority` languages lead
 * (in the order given) so a French reader sees Français first; the rest follow
 * alphabetically by label. Editions sort by name within a group.
 */
export function groupByLanguage(
  resources: QuranResource[],
  priority: string[] = []
): ResourceGroup[] {
  const groups = new Map<string, QuranResource[]>();
  for (const r of resources) {
    const bucket = groups.get(r.language);
    if (bucket) bucket.push(r);
    else groups.set(r.language, [r]);
  }

  return [...groups.entries()]
    .map(([language, rows]) => {
      const label = languageLabel(language);
      return {
        language,
        label,
        // New objects, never a mutation: `resources` comes from the shared
        // catalogue cache that every picker on the page reads.
        resources: rows
          .map((r) => ({ ...r, languageLabel: label }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      };
    })
    .sort((a, b) => {
      const ai = priority.indexOf(a.language);
      const bi = priority.indexOf(b.language);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.label.localeCompare(b.label);
    });
}

/**
 * Fields a picker's search box matches on: the edition, its author, and its
 * language in both native script and the backend's English name — so "urdu",
 * "اردو", "Maududi" and "Abul Ala" all find the same row.
 */
export const EDITION_FILTER_FIELDS = [
  "name",
  "author_name",
  "languageLabel",
  "language",
];

const RTL_LANGUAGES = new Set([
  "arabic",
  "urdu",
  "persian",
  "pashto",
  "sindhi",
  "kurdish",
  "dhivehi",
  "uyghur",
  "hebrew",
]);

export function languageDir(lang: string | undefined): "rtl" | "ltr" {
  return lang && RTL_LANGUAGES.has(lang) ? "rtl" : "ltr";
}
