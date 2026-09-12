export type ComboMod = "mod" | "shift" | "alt";
export interface Combo {
  mods: ComboMod[];
  key: string;
}

export const isMac =
  typeof navigator !== "undefined" &&
  navigator.platform.toUpperCase().includes("MAC");

export function formatCombo({ mods, key }: Combo): string {
  const glyphs = isMac
    ? { mod: "⌘", shift: "⇧", alt: "⌥" }
    : { mod: "Ctrl", shift: "Shift", alt: "Alt" };
  return [...mods.map((m) => glyphs[m]), key].join(isMac ? "" : "+");
}

export const mod = (key: string): Combo => ({ mods: ["mod"], key });
export const modShift = (key: string): Combo => ({ mods: ["mod", "shift"], key });
