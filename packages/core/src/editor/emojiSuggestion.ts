import tippy, { type Instance as TippyInstance } from "tippy.js";
import { createApp, h, ref, type App } from "vue";
import { getOverlayTarget } from "../mount/overlay";
import EmojiMenu from "./EmojiMenu.vue";
import type { EmojiItem } from "@tiptap/extension-emoji";
import type { Editor, Range } from "@tiptap/core";

type MenuItem = (EmojiItem | HonorificMenuItem) & { emoji?: string };

type HonorificMenuItem = {
  name: string;
  emoji: string;
  shortcodes: string[];
  tags: string[];
  isHonorific: true;
  honorificType: "jj" | "saw";
};

const HONORIFIC_ITEMS: HonorificMenuItem[] = [
  {
    name: "saw - صلى",
    emoji: "ﷺ",
    shortcodes: ["saw", "saws", "صلع", "صلى"],
    tags: ["honorific", "saw", "prophet", "muhammad", "salawat"],
    isHonorific: true,
    honorificType: "saw",
  },
  {
    name: "jj - جل",
    emoji: "ﷻ",
    shortcodes: ["jj", "جل"],
    tags: ["honorific", "jj", "allah", "jalla", "jalaluhu"],
    isHonorific: true,
    honorificType: "jj",
  },
];

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
    const honorifics: MenuItem[] = q
      ? HONORIFIC_ITEMS.filter(matchHonorific)
      : [...HONORIFIC_ITEMS];
    const emojis = storage.emojis
      .filter(
        (item) =>
          item.name.includes(q) ||
          item.shortcodes.some((sc) => sc.includes(q)) ||
          item.tags.some((tag) => tag.includes(q))
      )
      .slice(0, 8 - honorifics.length);
    return [...honorifics, ...emojis];
  },

  render: () => {
    let tippyInstance: TippyInstance | null = null;
    let vueApp: App | null = null;
    let container: HTMLElement | null = null;
    const selectedIndex = ref(0);
    const items = ref<MenuItem[]>([]);
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
        tippyInstance?.hide();
        return;
      }
      commandCallback?.(item);
    };

    function mountMenu() {
      if (!container) return;
      vueApp?.unmount();
      vueApp = createApp({
        render: () =>
          h(EmojiMenu, {
            items: items.value,
            selectedIndex: selectedIndex.value,
            onSelect: (item: { name: string; emoji?: string }) =>
              selectItem(item as MenuItem),
          }),
      });
      vueApp.mount(container);

      requestAnimationFrame(() => {
        container
          ?.querySelector(`[data-index="${selectedIndex.value}"]`)
          ?.scrollIntoView({ block: "nearest" });
      });
    }

    return {
      onStart: (props: SuggestionProps) => {
        items.value = props.items;
        selectedIndex.value = 0;
        commandCallback = props.command;
        currentEditor = props.editor;
        currentRange = props.range;

        container = document.createElement("div");
        mountMenu();

        tippyInstance = tippy(document.body, {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => getOverlayTarget(),
          content: container,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        });
      },

      onUpdate: (props: SuggestionProps) => {
        items.value = props.items;
        selectedIndex.value = 0;
        commandCallback = props.command;
        currentEditor = props.editor;
        currentRange = props.range;
        mountMenu();

        if (tippyInstance && props.clientRect) {
          tippyInstance.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        }
      },

      onKeyDown: (props: { event: KeyboardEvent }) => {
        const { event } = props;
        if (event.key === "ArrowDown") {
          selectedIndex.value = (selectedIndex.value + 1) % items.value.length;
          mountMenu();
          return true;
        }
        if (event.key === "ArrowUp") {
          selectedIndex.value =
            (selectedIndex.value - 1 + items.value.length) % items.value.length;
          mountMenu();
          return true;
        }
        if (event.key === "Enter") {
          const item = items.value[selectedIndex.value];
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
        vueApp?.unmount();
        tippyInstance = null;
        vueApp = null;
        container = null;
        currentEditor = null;
        currentRange = null;
      },
    };
  },
};
