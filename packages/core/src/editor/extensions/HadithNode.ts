import { Node, mergeAttributes } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import {
  isReferenceColor,
  isReferenceFill,
  type ReferenceColor,
  type ReferenceFill,
} from "../../composables/useReferenceColors";
import HadithNodeView from "../HadithNodeView.vue";

export interface HadithNodeAttributes {
  collectionNameArabic: string;
  collectionNameEnglish: string;
  number: number;
  text: string;
  // Whether the inline translation strip is expanded. Persisted in the doc
  // (like a toggle-list item's open state) so an author's choice travels with
  // the document; readers can still toggle it locally without mutating the doc.
  translationOpen: boolean;
  // Presentation style. The node is ALWAYS an inline atom in the document
  // model; "card" only changes how the node-view paints it (CSS block), it does
  // not make the node a real block node. Defaults to "inline" so old docs are
  // unaffected.
  displayMode: "inline" | "card";
  // Per-node text colour; null follows the reader's default for the kind.
  color: ReferenceColor | null;
  // Card fill style; null follows the default.
  fill: ReferenceFill | null;
}

export const HadithNode = Node.create({
  name: "hadithNode",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      collectionNameArabic: { default: "" },
      collectionNameEnglish: { default: "" },
      number: { default: 0 },
      text: { default: "" },
      translationOpen: {
        default: false,
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-translation-open") === "true",
        renderHTML: (attrs) =>
          attrs.translationOpen ? { "data-translation-open": "true" } : {},
      },
      displayMode: {
        default: "inline",
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-display-mode") === "card"
            ? "card"
            : "inline",
        renderHTML: (attrs) =>
          attrs.displayMode === "card" ? { "data-display-mode": "card" } : {},
      },
      color: {
        default: null,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-reference-color");
          return isReferenceColor(v) ? v : null;
        },
        renderHTML: (attrs) =>
          attrs.color ? { "data-reference-color": attrs.color } : {},
      },
      fill: {
        default: null,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-reference-fill");
          return isReferenceFill(v) ? v : null;
        },
        renderHTML: (attrs) =>
          attrs.fill ? { "data-reference-fill": attrs.fill } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="hadith-node"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "hadith-node" }),
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(HadithNodeView as any);
  },
});
