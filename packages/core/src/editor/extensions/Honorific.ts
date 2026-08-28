import { Node, mergeAttributes, InputRule, nodePasteRule } from "@tiptap/core";
import { Fragment, type Schema } from "@tiptap/pm/model";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import HonorificView from "../HonorificView.vue";
import { trackEvent } from "../runtime/analytics";
import {
  HONORIFIC_SHORTCODE_MAP,
  HONORIFIC_TYPES,
  isHonorificType,
  type HonorificType,
} from "../honorifics";

// The honorific registry (glyphs, labels, shortcodes) lives in ../honorifics;
// re-exported here so existing importers of "./extensions/Honorific" keep working.
export { HONORIFIC_TYPES, isHonorificType };
export type { HonorificType };

const SHORTCODE_MAP = HONORIFIC_SHORTCODE_MAP;

/** Where a honorific insertion originated, for analytics segmentation. */
export type HonorificInsertSource =
  | "shortcode" // typed `:saw:` (input rule)
  | "menu" // `:` emoji/honorific suggestion menu
  | "toolbar" // Insert-menu button
  | "slash" // `/` slash command
  | "paste" // pasted text containing `:saw:`
  | "find_replace"; // Find & Replace substitution

// Every insertion path funnels through here so typing `:saw:`, the `:` menu, the
// toolbar, slash commands, etc. all emit the same per-honorific event. The event
// name carries the honorific id (its canonical shortcode); `type`/`source` are
// duplicated as properties so the data can also be queried without the suffix.
export function trackHonorificInserted(
  type: HonorificType | undefined,
  source: HonorificInsertSource
): void {
  // Callers pass a `SHORTCODE_MAP[...]` lookup, typed as possibly-undefined; in
  // practice the regexes only match known shortcodes, but guard rather than emit
  // a `honourifics_inserted_undefined` event.
  if (!type) return;
  trackEvent(`honourifics_inserted_${type}`, { type, source });
}

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
      trackHonorificInserted(honorificType, "find_replace");
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
          const honorificType = SHORTCODE_MAP[shortcode];
          trackHonorificInserted(honorificType, "paste");
          return { type: honorificType };
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
          trackHonorificInserted(honorificType, "shortcode");
        },
      }),
    ];
  },
});
