import { ref } from "vue";

// Keys map to --color-reference-<key> (light + dark values in the stylesheets).
export const REFERENCE_COLORS = [
  "plum",
  "olive",
  "red",
  "orange",
  "gold",
  "green",
  "teal",
  "blue",
  "violet",
  "pink",
  "ink",
] as const;

export type ReferenceColor = (typeof REFERENCE_COLORS)[number];
export type ReferenceKind = "quran" | "hadith";
export type ReferenceDefaults = Record<ReferenceKind, ReferenceColor>;

export const BUILTIN_REFERENCE_COLORS: ReferenceDefaults = {
  quran: "plum",
  hadith: "olive",
};

const STORAGE_KEY = "reference.colors";

export function isReferenceColor(v: unknown): v is ReferenceColor {
  return (REFERENCE_COLORS as readonly unknown[]).includes(v);
}

export function referenceColorVar(color: ReferenceColor): string {
  return `var(--color-reference-${color})`;
}

function readStored(): ReferenceDefaults {
  const out = { ...BUILTIN_REFERENCE_COLORS };
  if (typeof localStorage === "undefined") return out;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (isReferenceColor(parsed?.quran)) out.quran = parsed.quran;
    if (isReferenceColor(parsed?.hadith)) out.hadith = parsed.hadith;
  } catch {
    /* ignore — corrupt or blocked storage */
  }
  return out;
}

// Module-level singleton so every node view reacts to a settings change.
const defaultColors = ref<ReferenceDefaults>(readStored());

export function setDefaultReferenceColor(
  kind: ReferenceKind,
  color: ReferenceColor
) {
  defaultColors.value = { ...defaultColors.value, [kind]: color };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultColors.value));
  } catch {
    /* ignore — private windows */
  }
}

/** Set defaults without persisting — the PDF render page's fresh browser. */
export function seedReferenceColors(colors: Partial<Record<ReferenceKind, unknown>>) {
  const next = { ...defaultColors.value };
  for (const kind of Object.keys(next) as ReferenceKind[]) {
    const c = colors[kind];
    if (isReferenceColor(c)) next[kind] = c;
  }
  defaultColors.value = next;
}

/** A node's own colour wins; otherwise the user's default for its kind. */
export function resolveReferenceColor(
  kind: ReferenceKind,
  nodeColor: unknown
): ReferenceColor {
  return isReferenceColor(nodeColor) ? nodeColor : defaultColors.value[kind];
}

export function useReferenceColors() {
  return { defaultColors, setDefaultReferenceColor };
}
