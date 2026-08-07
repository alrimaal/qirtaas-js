import Moveable from "moveable";
import type {
  NodeViewRenderer,
  NodeViewRendererProps,
} from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";

export type ImageAlign = "left" | "center" | "right";

interface Options {
  nodeName: string;
  buildImg: (props: NodeViewRendererProps) => HTMLImageElement;
  syncImg?: (img: HTMLImageElement, newNode: PMNode, oldNode: PMNode) => void;
}

export function createResizableImageNodeView(opts: Options): NodeViewRenderer {
  return (props) => {
    const { node, editor, getPos } = props;
    let currentNode = node;

    const wrapper = document.createElement("figure");
    wrapper.dataset.type = "resizable-image";
    wrapper.dataset.node = opts.nodeName;
    wrapper.dataset.align = (node.attrs.align as ImageAlign) ?? "center";

    const img = opts.buildImg(props);
    img.draggable = false;
    img.style.display = "block";
    img.style.maxWidth = "100%";
    img.style.userSelect = "none";
    wrapper.appendChild(img);

    const applySize = (n: PMNode) => {
      const w = n.attrs.width as number | null;
      const h = n.attrs.height as number | null;
      const pct = n.attrs.widthPercent as number | null;
      // The stored px width/height only ever supply the aspect-ratio now; the
      // ratio holds the box shape while the width is expressed as a percentage.
      const ratio = w && h ? `${w} / ${h}` : "";
      if (pct) {
        // Percentage of the content column — renders at the same fraction on any
        // surface width (wide editor and narrow A4 PDF alike).
        img.style.width = `${pct}%`;
        img.style.height = "auto";
        img.style.aspectRatio = ratio;
      } else if (w) {
        // Legacy px width (images resized before widthPercent existed).
        img.style.width = `${w}px`;
        img.style.height = "auto";
        img.style.aspectRatio = ratio;
      } else {
        img.style.width = "";
        img.style.height = "auto";
        img.style.aspectRatio = "";
      }
    };
    applySize(node);

    let moveable: Moveable | null = null;
    let host: HTMLElement | null = null;
    let onReposition: (() => void) | null = null;

    const findHost = (): HTMLElement => {
      const editorRoot = editor.view.dom as HTMLElement;
      return (
        editorRoot.closest<HTMLElement>("[data-editor-scroll]") ?? document.body
      );
    };

    const mount = () => {
      if (moveable || !editor.isEditable) return;
      host = findHost();
      // Moveable's control box is absolutely positioned inside the host; a
      // static host would anchor it to an ancestor outside the scroller,
      // offsetting the frame and letting it escape the editor's overflow clip.
      if (getComputedStyle(host).position === "static") {
        host.style.position = "relative";
      }
      moveable = new Moveable(host, {
        target: img,
        resizable: true,
        keepRatio: true,
        renderDirections: ["sw", "se"],
        origin: false,
        edge: false,
        throttleResize: 0,
        hideDefaultLines: true,
        zoom: 1,
      });

      moveable.on("resize", ({ width, height }) => {
        img.style.aspectRatio = "";
        img.style.width = `${width}px`;
        img.style.height = `${height}px`;
      });

      moveable.on("resizeEnd", () => {
        const rect = img.getBoundingClientRect();
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        const pos = getPos();
        if (pos === undefined) return;
        // Measure the fraction against the figure — the block the image lays out
        // in, and the same box CSS resolves `width: %` against later. Store that
        // percentage; keep the px width/height as the aspect-ratio source.
        const columnWidth = wrapper.clientWidth || rect.width;
        const percent = Math.max(
          1,
          Math.min(100, Math.round((rect.width / columnWidth) * 100)),
        );
        editor.view.dispatch(
          editor.state.tr
            .setNodeAttribute(pos, "width", w)
            .setNodeAttribute(pos, "height", h)
            .setNodeAttribute(pos, "widthPercent", percent),
        );
      });

      onReposition = () => moveable?.updateRect();
      host.addEventListener("scroll", onReposition, { passive: true });
      window.addEventListener("resize", onReposition);
    };

    const unmount = () => {
      if (onReposition && host) {
        host.removeEventListener("scroll", onReposition);
        window.removeEventListener("resize", onReposition);
      }
      onReposition = null;
      moveable?.destroy();
      moveable = null;
    };

    return {
      dom: wrapper,
      selectNode() {
        mount();
      },
      deselectNode() {
        unmount();
      },
      update(newNode) {
        if (newNode.type.name !== opts.nodeName) return false;
        const align = (newNode.attrs.align as ImageAlign) ?? "center";
        if (wrapper.dataset.align !== align) wrapper.dataset.align = align;
        opts.syncImg?.(img, newNode, currentNode);
        applySize(newNode);
        currentNode = newNode;
        moveable?.updateRect();
        return true;
      },
      ignoreMutation() {
        return true;
      },
      destroy() {
        unmount();
      },
    };
  };
}
