import { Node, mergeAttributes } from "@tiptap/core";
import type { NodeViewRenderer } from "@tiptap/core";
import { mushafClipUrl } from "@qirtaas/core/services/quran";
import { createResizableImageNodeView } from "./resizableImageNodeView";

export type MushafAlign = "left" | "center" | "right";

export interface QuranMushafEndpoint {
  surah: number;
  ayah: number;
  word: number;
}

export interface QuranMushafAttributes {
  page: number;
  lineStart: number;
  lineEnd: number;
  from: QuranMushafEndpoint | null;
  to: QuranMushafEndpoint | null;
  width: number | null;
  height: number | null;
  align: MushafAlign;
}

function readNum(el: HTMLElement, attr: string): number | null {
  const v = el.getAttribute(attr);
  return v == null ? null : Number(v);
}

function readEndpoint(
  el: HTMLElement,
  prefix: "from" | "to"
): QuranMushafEndpoint | null {
  const s = el.getAttribute(`data-${prefix}-surah`);
  const a = el.getAttribute(`data-${prefix}-ayah`);
  const w = el.getAttribute(`data-${prefix}-word`);
  if (!s || !a || !w) return null;
  return { surah: Number(s), ayah: Number(a), word: Number(w) };
}

function renderEndpoint(
  ep: QuranMushafEndpoint | null,
  prefix: "from" | "to"
): Record<string, string> {
  if (!ep) return {};
  return {
    [`data-${prefix}-surah`]: String(ep.surah),
    [`data-${prefix}-ayah`]: String(ep.ayah),
    [`data-${prefix}-word`]: String(ep.word),
  };
}

function srcFor(a: QuranMushafAttributes): string | null {
  if (a.page && a.lineStart && a.lineEnd) {
    return mushafClipUrl({
      page: a.page,
      lineStart: a.lineStart,
      lineEnd: a.lineEnd,
    });
  }
  return null;
}

export const QuranMushaf = Node.create({
  name: "quranMushaf",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      page: {
        default: 0,
        parseHTML: (el) => readNum(el as HTMLElement, "data-page") ?? 0,
        renderHTML: (attrs) =>
          attrs.page ? { "data-page": String(attrs.page) } : {},
      },
      lineStart: {
        default: 0,
        parseHTML: (el) => readNum(el as HTMLElement, "data-line-start") ?? 0,
        renderHTML: (attrs) =>
          attrs.lineStart
            ? { "data-line-start": String(attrs.lineStart) }
            : {},
      },
      lineEnd: {
        default: 0,
        parseHTML: (el) => readNum(el as HTMLElement, "data-line-end") ?? 0,
        renderHTML: (attrs) =>
          attrs.lineEnd ? { "data-line-end": String(attrs.lineEnd) } : {},
      },
      from: {
        default: null,
        parseHTML: (el) => readEndpoint(el as HTMLElement, "from"),
        renderHTML: (attrs) => renderEndpoint(attrs.from, "from"),
      },
      to: {
        default: null,
        parseHTML: (el) => readEndpoint(el as HTMLElement, "to"),
        renderHTML: (attrs) => renderEndpoint(attrs.to, "to"),
      },
      width: {
        default: null,
        parseHTML: (el) => readNum(el as HTMLElement, "data-width"),
        renderHTML: (attrs) =>
          attrs.width ? { "data-width": String(attrs.width) } : {},
      },
      height: {
        default: null,
        parseHTML: (el) => readNum(el as HTMLElement, "data-height"),
        renderHTML: (attrs) =>
          attrs.height ? { "data-height": String(attrs.height) } : {},
      },
      align: {
        default: "center" as MushafAlign,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-align");
          return v === "left" || v === "right" ? v : "center";
        },
        renderHTML: (attrs) => ({ "data-align": attrs.align ?? "center" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-type="quran-mushaf"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes(HTMLAttributes, { "data-type": "quran-mushaf" }),
    ];
  },

  addNodeView(): NodeViewRenderer {
    return createResizableImageNodeView({
      nodeName: "quranMushaf",
      buildImg: ({ node }) => {
        const img = document.createElement("img");
        img.alt = "";
        img.classList.add("quran-mushaf-img");
        const url = srcFor(node.attrs as QuranMushafAttributes);
        if (url) img.src = url;
        return img;
      },
      syncImg: (img, newNode, oldNode) => {
        const a = newNode.attrs as QuranMushafAttributes;
        const b = oldNode.attrs as QuranMushafAttributes;
        if (
          a.page !== b.page ||
          a.lineStart !== b.lineStart ||
          a.lineEnd !== b.lineEnd
        ) {
          const url = srcFor(a);
          if (url) img.src = url;
        }
      },
    });
  },
});
