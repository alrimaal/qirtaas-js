import { Node, mergeAttributes, InputRule, nodePasteRule } from "@tiptap/core";
import { Fragment, type Schema } from "@tiptap/pm/model";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import HonorificView from "../HonorificView.vue";

export type HonorificType = "jj" | "saw";

const SHORTCODE_MAP: Record<string, HonorificType> = {
  // جل جلاله
  jj: "jj",
  جل: "jj",
  // صلى الله عليه وسلم
  saw: "saw",
  saws: "saw",
  صلع: "saw",
  صلى: "saw",
};

const shortcodeKeys = Object.keys(SHORTCODE_MAP)
  .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
const inputRegex = new RegExp(`:(?<shortcode>${shortcodeKeys}):$`);
const pasteRegex = new RegExp(`:(?<shortcode>${shortcodeKeys}):`, "g");

/**
 * Parses a string for :shortcode: patterns and returns a ProseMirror Fragment
 * with text nodes and honorific nodes. Used by find-replace.
 */
export function parseReplacementText(text: string, schema: Schema): Fragment {
  if (!schema.nodes.honorific) {
    return Fragment.from(text ? schema.text(text) : []);
  }

  const regex = new RegExp(`:(?:${shortcodeKeys}):`, "g");
  const nodes: import("@tiptap/pm/model").Node[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    const before = text.slice(lastIndex, match.index);
    if (before) nodes.push(schema.text(before));

    const shortcode = match[0].slice(1, -1);
    const honorificType = SHORTCODE_MAP[shortcode];
    if (honorificType) {
      nodes.push(schema.nodes.honorific.create({ type: honorificType }));
    }
    lastIndex = match.index! + match[0].length;
  }

  const after = text.slice(lastIndex);
  if (after) nodes.push(schema.text(after));

  return Fragment.from(nodes);
}

export const Honorific = Node.create({
  name: "honorific",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      type: { default: "jj" as HonorificType },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="honorific"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "honorific" }),
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(HonorificView as any);
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: pasteRegex,
        type: this.type,
        getAttributes: (match) => {
          const shortcode = match[0].slice(1, -1);
          return { type: SHORTCODE_MAP[shortcode] };
        },
      }),
    ];
  },

  addInputRules() {
    return [
      new InputRule({
        find: inputRegex,
        handler: ({ state, range, match }) => {
          const shortcode = match.groups?.shortcode;
          if (!shortcode || !(shortcode in SHORTCODE_MAP)) return null;

          const honorificType = SHORTCODE_MAP[shortcode];
          const nodeType = state.schema.nodes.honorific;
          if (!nodeType) return null;
          const node = nodeType.create({ type: honorificType });
          state.tr.replaceWith(range.from, range.to, node);
          state.tr.setMeta("honorific", true);
        },
      }),
    ];
  },
});
