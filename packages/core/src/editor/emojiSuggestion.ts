import tippy, { type Instance as TippyInstance } from "tippy.js";
import { VueRenderer } from "@tiptap/vue-3";
import { getOverlayTarget } from "../mount/overlay";
import EmojiMenu from "./EmojiMenu.vue";
import type { EmojiItem } from "@tiptap/extension-emoji";
import type { Editor, Range } from "@tiptap/core";
import { HONORIFICS, type HonorificType } from "./honorifics";
import { trackHonorificInserted } from "./extensions/Honorific";

type MenuItem = (EmojiItem | HonorificMenuItem) & { emoji?: string };

type HonorificMenuItem = {
  name: string;
  emoji: string;
  shortcodes: string[];
  tags: string[];
  isHonorific: true;
  honorificType: HonorificType;
};

const HONORIFIC_ITEMS: HonorificMenuItem[] = HONORIFICS.map((h) => ({
  name: `${h.en} — ${h.ar}`,
  emoji: h.glyph,
  shortcodes: [...h.shortcodes],
  tags: ["honorific", h.id, ...h.tags],
  isHonorific: true,
  honorificType: h.id,
}));

type SuggestionProps = {
  clientRect?: (() => DOMRect | null) | null;
  items: MenuItem[];
  command: (item: MenuItem) => void;
  editor: Editor;
  range: Range;
};

export const emojiSuggestion = {
  items: ({ query, editor }: { query: string; editor: unknown }) => {
    const storage = (editor as { storage: { emoji: { emojis: EmojiItem[] } } })
      .storage.emoji;
    const q = query.toLowerCase();
    const matchHonorific = (h: HonorificMenuItem) =>
      h.name.includes(q) ||
      h.shortcodes.some((sc) => sc.toLowerCase().includes(q)) ||
      h.tags.some((tag) => tag.includes(q));
    // Honorifics take priority but are capped so a bare `:` (empty query) can't
    // flood the menu now that there are many of them; the rest of the 8 slots
    // are filled with emoji matches.
    const honorifics: MenuItem[] = (
      q ? HONORIFIC_ITEMS.filter(matchHonorific) : HONORIFIC_ITEMS
    ).slice(0, 8);
    const emojis = storage.emojis
      .filter(
        (item) =>
          item.name.includes(q) ||
          item.shortcodes.some((sc) => sc.includes(q)) ||
          item.tags.some((tag) => tag.includes(q))
      )
      .slice(0, Math.max(0, 8 - honorifics.length));
    return [...honorifics, ...emojis];
  },

  render: () => {
    let tippyInstance: TippyInstance | null = null;
    let renderer: VueRenderer | null = null;
    let selectedIndex = 0;
    let items: MenuItem[] = [];
    let commandCallback: ((item: MenuItem) => void) | null = null;
    let currentEditor: Editor | null = null;
    let currentRange: Range | null = null;

    const selectItem = (item: MenuItem) => {
      if (
        (item as HonorificMenuItem).isHonorific &&
        currentEditor &&
        currentRange
      ) {
        const honorificType = (item as HonorificMenuItem).honorificType;
        currentEditor
          .chain()
          .focus()
          .deleteRange(currentRange)
          .insertContent({
            type: "honorific",
            attrs: { type: honorificType },
          })
          .run();
        trackHonorificInserted(honorificType, "menu");
        tippyInstance?.hide();
        return;
      }
      commandCallback?.(item);
    };

    // Patches the mounted menu's props; Vue diffs from there. The menu is
    // created once per session, in onStart.
    function paint() {
      renderer?.updateProps({ items, selectedIndex });
      requestAnimationFrame(() => {
        renderer?.el
          ?.querySelector(`[data-index="${selectedIndex}"]`)
          ?.scrollIntoView({ block: "nearest" });
      });
    }

    return {
      onStart: (props: SuggestionProps) => {
        items = props.items;
        selectedIndex = 0;
        commandCallback = props.command;
        currentEditor = props.editor;
        currentRange = props.range;

        // VueRenderer (not createApp) so the menu inherits the host app's
        // context — i18n, PrimeVue, provides — via editor.appContext.
        renderer = new VueRenderer(EmojiMenu, {
          editor: props.editor,
          props: {
            items,
            selectedIndex,
            onSelect: (item: { name: string; emoji?: string }) =>
              selectItem(item as MenuItem),
          },
        });
        paint();

        tippyInstance = tippy(document.body, {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => getOverlayTarget(),
          content: renderer.el as Element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        });
      },

      onUpdate: (props: SuggestionProps) => {
        items = props.items;
        selectedIndex = 0;
        commandCallback = props.command;
        currentEditor = props.editor;
        currentRange = props.range;
        paint();

        if (tippyInstance && props.clientRect) {
          tippyInstance.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        }
      },

      onKeyDown: (props: { event: KeyboardEvent }) => {
        const { event } = props;
        if (event.key === "ArrowDown") {
          selectedIndex = (selectedIndex + 1) % items.length;
          paint();
          return true;
        }
        if (event.key === "ArrowUp") {
          selectedIndex = (selectedIndex - 1 + items.length) % items.length;
          paint();
          return true;
        }
        if (event.key === "Enter") {
          const item = items[selectedIndex];
          if (item) selectItem(item);
          return true;
        }
        if (event.key === "Escape") {
          tippyInstance?.hide();
          return true;
        }
        return false;
      },

      onExit: () => {
        tippyInstance?.destroy();
        renderer?.destroy();
        tippyInstance = null;
        renderer = null;
        currentEditor = null;
        currentRange = null;
      },
    };
  },
};
