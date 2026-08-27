export interface HonorificDef {
  /** Stable id, stored as the honorific node's `type` attribute. */
  readonly id: string;
  /** Unicode glyph, rendered in the Kitab font. */
  readonly glyph: string;
  /** Arabic phrase — node tooltip and Arabic UI label. */
  readonly ar: string;
  /** English transliteration — English UI label. */
  readonly en: string;
  /** Typed `:code:` shortcodes (English + Arabic); also used as search terms. */
  readonly shortcodes: readonly string[];
  /** Extra search keywords for the suggestion menus. */
  readonly tags: readonly string[];
}

export const HONORIFICS = [
  {
    id: "saw",
    glyph: "ﷺ",
    ar: "صلى الله عليه وسلم",
    en: "Sallallahu Alayhi Wasallam",
    shortcodes: ["saw", "saws", "صلع", "صلى"],
    tags: ["prophet", "muhammad", "salawat"],
  },
  {
    id: "jj",
    glyph: "ﷻ",
    ar: "جل جلاله",
    en: "Jalla Jalaaluhu",
    shortcodes: ["jj", "جل"],
    tags: ["allah", "jalla", "jalaluhu"],
  },
  {
    id: "swt",
    glyph: "﷾",
    ar: "سبحانه وتعالى",
    en: "Subhanahu wa Taala",
    shortcodes: ["swt", "سبحانه"],
    tags: ["allah", "subhanahu", "taala"],
  },
  {
    id: "azwj",
    glyph: "﷿",
    ar: "عز وجل",
    en: "Azza wa Jall",
    shortcodes: ["azwj", "عزوجل"],
    tags: ["allah", "azza", "jall"],
  },
  {
    id: "rah",
    glyph: "﵀",
    ar: "رحمه الله",
    en: "Rahimahullah",
    shortcodes: ["rah", "رحمه"],
    tags: ["rahimahullah", "mercy"],
  },
  {
    id: "ra",
    glyph: "﵁",
    ar: "رضي الله عنه",
    en: "Radiyallahu Anhu",
    shortcodes: ["ra", "رضه"],
    tags: ["radiyallahu", "anhu", "companion"],
  },
  {
    id: "rha",
    glyph: "﵂",
    ar: "رضي الله عنها",
    en: "Radiyallahu Anha",
    shortcodes: ["rha", "رضها"],
    tags: ["radiyallahu", "anha"],
  },
  {
    id: "rhm",
    glyph: "﵃",
    ar: "رضي الله عنهم",
    en: "Radiyallahu Anhum",
    shortcodes: ["rhm", "رضهم"],
    tags: ["radiyallahu", "anhum"],
  },
  {
    id: "rhma",
    glyph: "﵄",
    ar: "رضي الله عنهما",
    en: "Radiyallahu Anhuma",
    shortcodes: ["rhma", "رضهما"],
    tags: ["radiyallahu", "anhuma"],
  },
  {
    id: "rhn",
    glyph: "﵅",
    ar: "رضي الله عنهن",
    en: "Radiyallahu Anhunna",
    shortcodes: ["rhn", "رضهن"],
    tags: ["radiyallahu", "anhunna"],
  },
  {
    id: "as",
    glyph: "﵇",
    ar: "عليه السلام",
    en: "Alayhi as-Salam",
    shortcodes: ["as", "عس"],
    tags: ["alayhi", "salam", "peace"],
  },
  {
    id: "asa",
    glyph: "﵍",
    ar: "عليها السلام",
    en: "Alayha as-Salam",
    shortcodes: ["asa", "عاس"],
    tags: ["alayha", "salam"],
  },
  {
    id: "asm",
    glyph: "﵈",
    ar: "عليهم السلام",
    en: "Alayhim as-Salam",
    shortcodes: ["ams", "عمس"],
    tags: ["alayhim", "salam"],
  },
  {
    id: "asma",
    glyph: "﵉",
    ar: "عليهما السلام",
    en: "Alayhima as-Salam",
    shortcodes: ["asma", "عماس"],
    tags: ["alayhima", "salam"],
  },
] as const satisfies readonly HonorificDef[];

export type HonorificType = (typeof HONORIFICS)[number]["id"];

export const HONORIFIC_TYPES = HONORIFICS.map((h) => h.id) as HonorificType[];

export const HONORIFIC_BY_TYPE = HONORIFICS.reduce((acc, h) => {
  acc[h.id] = h;
  return acc;
}, {} as Record<HonorificType, HonorificDef>);

/** `:shortcode:` → honorific id, for input/paste rules and find-replace. */
export const HONORIFIC_SHORTCODE_MAP = Object.fromEntries(
  HONORIFICS.flatMap((h) => h.shortcodes.map((sc) => [sc, h.id]))
) as Record<string, HonorificType>;

export function isHonorificType(id: string): id is HonorificType {
  return Object.prototype.hasOwnProperty.call(HONORIFIC_BY_TYPE, id);
}
