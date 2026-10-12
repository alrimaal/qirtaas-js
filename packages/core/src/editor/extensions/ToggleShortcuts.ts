import { Extension, InputRule, wrappingInputRule } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { openToggle } from "../commands";

/** `> ` makes a toggle list and `" ` a quote, as in other block editors. */
export const ToggleShortcuts = Extension.create({
  name: "toggleShortcuts",

  // Ahead of StarterKit's blockquote, which also claims `> `.
  priority: 1000,

  addInputRules() {
    return [
      new InputRule({
        find: /^\s*>\s$/,
        handler: ({ state, range, chain }) => {
          const { $from } = state.selection;
          const container = $from.node(-1)?.type.name;
          if (
            $from.parent.type.name !== "paragraph" ||
            (container !== "doc" && container !== "detailsContent")
          ) {
            return null;
          }
          const first = $from.depth === 1 && $from.index(0) === 0;
          const c = chain().deleteRange(range);
          if (first) {
            // Keep a line above the toggle, as insertToggleList does.
            c.command(({ tr, state: s }) => {
              tr.insert(0, s.schema.nodes.paragraph!.create());
              return true;
            }).setTextSelection(range.from + 2);
          }
          c.setDetails().run();
          // Once the rule's transaction has been dispatched.
          queueMicrotask(() => openToggle(this.editor));
        },
      }),
      wrappingInputRule({
        find: /^\s*["“”]\s$/,
        type: this.editor.schema.nodes.blockquote!,
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      // In an open toggle's title, move onto its empty first line. Details
      // would add a second one above it, and then never exits on Enter.
      Enter: ({ editor }) => {
        const { state, view } = editor;
        const { $head } = state.selection;
        if ($head.parent.type.name !== "detailsSummary") return false;

        const dom = view.nodeDOM($head.before(-1));
        const open =
          dom instanceof HTMLElement && dom.classList.contains("is-open");
        const contentPos = $head.after();
        const first = state.doc.nodeAt(contentPos)?.firstChild;
        if (!open || first?.type.name !== "paragraph" || first.content.size) {
          return false;
        }

        view.dispatch(
          state.tr
            .setSelection(TextSelection.create(state.doc, contentPos + 2))
            .scrollIntoView()
        );
        return true;
      },
    };
  },
});
