import { Mark } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
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

/** A list marker belongs to its `li`, not the text, so it ignores the mark.
 *  Tag each item that opens with coloured text for `li::marker` to pick up. */
function markerDecorations(doc: PMNode): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== "listItem") return;
    const first = node.firstChild?.isTextblock
      ? node.firstChild.firstChild
      : null;
    const color = first?.marks.find((m) => m.type.name === "textColor")?.attrs
      .color;
    if (!isTextColor(color)) return;
    decorations.push(
      Decoration.node(pos, pos + node.nodeSize, {
        "data-marker-color": color,
        style: `--marker-color: ${textColorVar(color)}`,
      })
    );
  });
  return DecorationSet.create(doc, decorations);
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

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("textColorMarkers"),
        state: {
          init: (_, { doc }) => markerDecorations(doc),
          apply: (tr, old) => (tr.docChanged ? markerDecorations(tr.doc) : old),
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
