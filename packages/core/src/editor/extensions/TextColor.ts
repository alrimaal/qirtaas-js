import { Mark } from "@tiptap/core";
import { referenceColorVar } from "../../composables/useReferenceColors";

/** Text colours: gray (for "fill me in" placeholders) plus the verse palette,
 *  minus ink, which is the default text colour anyway. */
export const TEXT_COLORS = [
  "gray",
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
] as const;

export type TextColorName = (typeof TEXT_COLORS)[number];

export function isTextColor(v: unknown): v is TextColorName {
  return (TEXT_COLORS as readonly unknown[]).includes(v);
}

/** Theme-aware CSS colour for a text colour name. */
export function textColorVar(color: TextColorName): string {
  return color === "gray" ? "var(--color-muted)" : referenceColorVar(color);
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textColor: {
      setTextColor: (color: TextColorName) => ReturnType;
      unsetTextColor: () => ReturnType;
    };
  }
}

/** Text colour from the named palette. Stores the key, never a hex, so it
 *  follows the theme; pasted colours outside the palette are dropped. */
export const TextColor = Mark.create({
  name: "textColor",

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-text-color"),
        renderHTML: (attrs) => ({
          "data-text-color": attrs.color,
          style: `color: ${textColorVar(attrs.color)}`,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-text-color]",
        getAttrs: (el) =>
          isTextColor(el.getAttribute("data-text-color")) ? null : false,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },

  addCommands() {
    return {
      setTextColor:
        (color) =>
        ({ commands }) =>
          commands.setMark(this.name, { color }),
      unsetTextColor:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
