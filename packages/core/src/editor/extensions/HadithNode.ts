import { Node, mergeAttributes } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import HadithNodeView from "../HadithNodeView.vue";

export interface HadithNodeAttributes {
  collectionNameArabic: string;
  collectionNameEnglish: string;
  number: number;
  text: string;
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
