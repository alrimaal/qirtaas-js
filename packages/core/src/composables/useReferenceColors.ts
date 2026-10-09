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

// Card fill styles; the hue always follows the node's colour.
export const REFERENCE_FILLS = ["plain", "paper", "tint", "solid"] as const;
export type ReferenceFill = (typeof REFERENCE_FILLS)[number];
export type ReferenceFillDefaults = Record<ReferenceKind, ReferenceFill>;

// Paper is the original card.
export const BUILTIN_REFERENCE_FILLS: ReferenceFillDefaults = {
  quran: "paper",
  hadith: "paper",
};

const FILL_STORAGE_KEY = "reference.fills";

export function isReferenceFill(v: unknown): v is ReferenceFill {
  return (REFERENCE_FILLS as readonly unknown[]).includes(v);
}

export function referenceColorVar(color: ReferenceColor): string {
  return `var(--color-reference-${color})`;
}

function readStored<T extends string>(
  key: string,
  builtin: Record<ReferenceKind, T>,
  isValid: (v: unknown) => v is T
): Record<ReferenceKind, T> {
  const out = { ...builtin };
  if (typeof localStorage === "undefined") return out;
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "{}");
    if (isValid(parsed?.quran)) out.quran = parsed.quran;
    if (isValid(parsed?.hadith)) out.hadith = parsed.hadith;
  } catch {
    /* ignore — corrupt or blocked storage */
  }
  return out;
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore — private windows */
  }
}

// Module-level singleton so every node view reacts to a settings change.
const defaultColors = ref<ReferenceDefaults>(
  readStored(STORAGE_KEY, BUILTIN_REFERENCE_COLORS, isReferenceColor)
);
const defaultFills = ref<ReferenceFillDefaults>(
  readStored(FILL_STORAGE_KEY, BUILTIN_REFERENCE_FILLS, isReferenceFill)
);

export function setDefaultReferenceColor(
  kind: ReferenceKind,
  color: ReferenceColor
) {
  defaultColors.value = { ...defaultColors.value, [kind]: color };
  writeStored(STORAGE_KEY, defaultColors.value);
}

export function setDefaultReferenceFill(kind: ReferenceKind, fill: ReferenceFill) {
  defaultFills.value = { ...defaultFills.value, [kind]: fill };
  writeStored(FILL_STORAGE_KEY, defaultFills.value);
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

/** Fill counterpart of seedReferenceColors. */
export function seedReferenceFills(fills: Partial<Record<ReferenceKind, unknown>>) {
  const next = { ...defaultFills.value };
  for (const kind of Object.keys(next) as ReferenceKind[]) {
    const f = fills[kind];
    if (isReferenceFill(f)) next[kind] = f;
  }
  defaultFills.value = next;
}

/** A node's own colour wins; otherwise the user's default for its kind. */
export function resolveReferenceColor(
  kind: ReferenceKind,
  nodeColor: unknown
): ReferenceColor {
  return isReferenceColor(nodeColor) ? nodeColor : defaultColors.value[kind];
}

/** A node's own fill wins; otherwise the user's default for its kind. */
export function resolveReferenceFill(
  kind: ReferenceKind,
  nodeFill: unknown
): ReferenceFill {
  return isReferenceFill(nodeFill) ? nodeFill : defaultFills.value[kind];
}

export function useReferenceColors() {
  return {
    defaultColors,
    defaultFills,
    setDefaultReferenceColor,
    setDefaultReferenceFill,
  };
}
