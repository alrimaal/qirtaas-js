import { Node, mergeAttributes } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import QuranVerseView from "../QuranVerseView.vue";

export type QuranTextEncoding = "uthmani" | "qpc_hafs";

export interface QuranVerseAttributes {
  surah: number;
  // Legacy single-verse attr. Always read it via the helper so old docs work.
  ayah: number;
  // Range attrs. Default to `ayah` when absent.
  fromAyah: number | null;
  toAyah: number | null;
  // Word slice (only meaningful for single-verse selections).
  fromWord: number | null;
  toWord: number | null;
  surahNameArabic: string;
  surahNameEnglish: string;
  text: string;
  // Encoding of `text`. Defaults to "uthmani" so pre-existing nodes (which
  // were saved before QPC Hafs was introduced) deserialize correctly and
  // render with the legacy Arabic font.
  encoding: QuranTextEncoding;
  // Whether the inline translation strip is expanded. Persisted in the doc
  // (like a toggle-list item's open state) so an author's choice travels with
  // the document; readers can still toggle it locally without mutating the doc.
  translationOpen: boolean;
  // Presentation style. The node is ALWAYS an inline atom in the document
  // model; "card" only changes how the node-view paints it (CSS block), it does
  // not make the node a real block node. Defaults to "inline" so old docs are
  // unaffected.
  displayMode: "inline" | "card";
}

const num = (default_: number | null) => ({
  default: default_,
  parseHTML: (el: HTMLElement) => {
    const v = el.getAttribute("data-value");
    return v == null ? default_ : Number(v);
  },
  renderHTML: (v: number | null) => (v == null ? {} : { "data-value": String(v) }),
});

export const QuranVerse = Node.create({
  name: "quranVerse",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      surah: { default: 0 },
      ayah: { default: 0 },
      fromAyah: {
        default: null,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-from-ayah");
          return v == null ? null : Number(v);
        },
        renderHTML: (attrs) =>
          attrs.fromAyah == null ? {} : { "data-from-ayah": String(attrs.fromAyah) },
      },
      toAyah: {
        default: null,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-to-ayah");
          return v == null ? null : Number(v);
        },
        renderHTML: (attrs) =>
          attrs.toAyah == null ? {} : { "data-to-ayah": String(attrs.toAyah) },
      },
      fromWord: {
        default: null,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-from-word");
          return v == null ? null : Number(v);
        },
        renderHTML: (attrs) =>
          attrs.fromWord == null ? {} : { "data-from-word": String(attrs.fromWord) },
      },
      toWord: {
        default: null,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-to-word");
          return v == null ? null : Number(v);
        },
        renderHTML: (attrs) =>
          attrs.toWord == null ? {} : { "data-to-word": String(attrs.toWord) },
      },
      surahNameArabic: { default: "" },
      surahNameEnglish: { default: "" },
      text: { default: "" },
      encoding: {
        default: "uthmani",
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-encoding");
          return v === "qpc_hafs" ? "qpc_hafs" : "uthmani";
        },
        renderHTML: (attrs) => ({ "data-encoding": attrs.encoding }),
      },
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
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="quran-verse"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "quran-verse" }),
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(QuranVerseView as any);
  },
});
