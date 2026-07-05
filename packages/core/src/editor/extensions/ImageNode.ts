import { Node, mergeAttributes } from "@tiptap/core";
import type { NodeViewRenderer } from "@tiptap/core";
import { getImageUrl } from "@qirtaas/core/services/images";
import { createResizableImageNodeView } from "./resizableImageNodeView";

export type ImageAlign = "left" | "center" | "right";

export interface ImageNodeAttributes {
  imageId: string;
  alt: string;
  width: number | null;
  height: number | null;
  align: ImageAlign;
}

export interface ImageNodeOptions {
  documentId?: string;
  translate?: (key: string) => string;
}

export const ImageNode = Node.create<ImageNodeOptions>({
  name: "imageNode",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      documentId: undefined,
      translate: undefined,
    };
  },

  addAttributes() {
    return {
      imageId: { default: "" },
      alt: { default: "" },
      width: {
        default: null,
        parseHTML: (el) => {
          const v = el.getAttribute("data-width");
          return v ? Number(v) : null;
        },
        renderHTML: (attrs) =>
          attrs.width ? { "data-width": String(attrs.width) } : {},
      },
      height: {
        default: null,
        parseHTML: (el) => {
          const v = el.getAttribute("data-height");
          return v ? Number(v) : null;
        },
        renderHTML: (attrs) =>
          attrs.height ? { "data-height": String(attrs.height) } : {},
      },
      align: {
        default: "center" as ImageAlign,
        parseHTML: (el) => {
          const v = el.getAttribute("data-align");
          return v === "left" || v === "right" ? v : "center";
        },
        renderHTML: (attrs) => ({ "data-align": attrs.align ?? "center" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-type="image-node"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes(HTMLAttributes, { "data-type": "image-node" }),
    ];
  },

  addNodeView(): NodeViewRenderer {
    const ext = this;
    const t = (key: string) => ext.options.translate?.(key) ?? "";

    return createResizableImageNodeView({
      nodeName: "imageNode",
      buildImg: ({ node }) => {
        const img = document.createElement("img");
        img.alt = node.attrs.alt ?? "";
        img.classList.add("image-node-img");
        img.dataset.state = "loading";

        let currentImageId = node.attrs.imageId as string;

        const loadImage = async () => {
          const idAtStart = currentImageId;
          img.dataset.state = "loading";
          img.removeAttribute("src");
          img.title = t("editor.image.uploading");
          try {
            const url = await getImageUrl(idAtStart, ext.options.documentId);
            if (idAtStart !== currentImageId) return;
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject(new Error("img-load-failed"));
              img.src = url;
            });
            if (idAtStart !== currentImageId) return;
            img.dataset.state = "loaded";
            img.title = "";
          } catch {
            if (idAtStart !== currentImageId) return;
            img.removeAttribute("src");
            img.dataset.state = "failed";
            img.title = t("editor.image.failedToLoad");
          }
        };

        img.addEventListener("click", (e) => {
          if (img.dataset.state === "failed") {
            e.preventDefault();
            e.stopPropagation();
            loadImage();
          }
        });

        // Expose so syncImg can swap source on attribute change
        (img as HTMLImageElement & { __setImageId?: (id: string) => void }).__setImageId = (
          id: string,
        ) => {
          if (id !== currentImageId) {
            currentImageId = id;
            void loadImage();
          }
        };

        void loadImage();
        return img;
      },
      syncImg: (img, newNode) => {
        if (newNode.attrs.alt !== img.alt) img.alt = newNode.attrs.alt ?? "";
        const setter = (
          img as HTMLImageElement & { __setImageId?: (id: string) => void }
        ).__setImageId;
        setter?.(newNode.attrs.imageId as string);
      },
    });
  },
});
