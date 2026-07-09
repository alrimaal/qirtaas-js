import { Node, mergeAttributes } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import DocumentLinkNodeView from "../DocumentLinkNodeView.vue";

export interface DocumentLinkAttributes {
  targetDocId: string;
  // Title snapshot taken at insert time. Fallback for hosts that can't
  // resolve live titles (shared view, embed); live store data wins otherwise.
  label: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    documentLink: {
      insertDocumentLink: (targetDocId: string, label: string) => ReturnType;
    };
  }
}

export const DocumentLink = Node.create({
  name: "documentLink",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      targetDocId: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-target-doc-id") ?? "",
        renderHTML: (attrs) => ({ "data-target-doc-id": attrs.targetDocId }),
      },
      label: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-label") ?? "",
        renderHTML: (attrs) => ({ "data-label": attrs.label }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="document-link"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "document-link" }),
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(DocumentLinkNodeView as any);
  },

  addCommands() {
    return {
      insertDocumentLink:
        (targetDocId: string, label: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { targetDocId, label },
          }),
    };
  },
});
