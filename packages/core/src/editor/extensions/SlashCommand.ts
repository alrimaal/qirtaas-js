import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import tippy, { type Instance as TippyInstance } from "tippy.js";

const SlashCommandPluginKey = new PluginKey("slashCommand");
import { createApp, h, ref, type App } from "vue";
import { getOverlayTarget } from "../../mount/overlay";
import SlashMenu from "../SlashMenu.vue";

export interface SlashCommandItem {
  id: string;
  label: string;
  searchTerms: string[];
  icon: string;
}

interface CommandDef {
  id: string;
  labelEn: string;
  labelAr: string;
  icon: string;
}

const COMMAND_DEFS: CommandDef[] = [
  { id: "quran", labelEn: "Quran", labelAr: "قرآن", icon: "pi pi-book" },
  { id: "hadith", labelEn: "Hadith", labelAr: "حديث", icon: "pi pi-comment" },
  {
    id: "page",
    labelEn: "Link to page",
    labelAr: "ربط صفحة",
    icon: "pi pi-file",
  },
  {
    id: "jj",
    labelEn: "ﷻ Jalla Jalaaluhu",
    labelAr: "ﷻ جل جلاله",
    icon: "pi pi-pencil",
  },
  {
    id: "saw",
    labelEn: "ﷺ Sallallahu Alayhi Wasallam",
    labelAr: "ﷺ صلى الله عليه وسلم",
    icon: "pi pi-pencil",
  },
];

function buildCommands(
  locale: string,
  commandFilter: (id: string) => boolean
): SlashCommandItem[] {
  const isAr = locale === "ar";
  return COMMAND_DEFS.filter((cmd) => commandFilter(cmd.id)).map((cmd) => ({
    id: cmd.id,
    label: isAr ? cmd.labelAr : cmd.labelEn,
    searchTerms: [cmd.labelEn.toLowerCase(), cmd.labelAr],
    icon: cmd.icon,
  }));
}

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      locale: "en" as string,
      // Lets hosts drop commands whose backing capability is unavailable
      // (e.g. /page when no document-link host is provided).
      commandFilter: ((_id: string) => true) as (id: string) => boolean,
      onCommand: (
        _commandId: string,
        _editor?: import("@tiptap/core").Editor,
      ) => {},
    };
  },

  addProseMirrorPlugins() {
    const onCommand = this.options.onCommand;
    const commands = buildCommands(this.options.locale, this.options.commandFilter);

    return [
      Suggestion({
        pluginKey: SlashCommandPluginKey,
        editor: this.editor,
        char: "/",
        startOfLine: false,
        items: ({ query }: { query: string }): SlashCommandItem[] => {
          const q = query.toLowerCase();
          return commands.filter((cmd) =>
            cmd.searchTerms.some((term) => term.includes(q)),
          );
        },
        render: () => {
          let tippyInstance: TippyInstance | null = null;
          let vueApp: App | null = null;
          let container: HTMLElement | null = null;
          const selectedIndex = ref(0);
          const items = ref<SlashCommandItem[]>([]);
          let commandCallback: ((item: SlashCommandItem) => void) | null = null;

          function mountMenu() {
            if (!container) return;
            vueApp?.unmount();
            vueApp = createApp({
              render: () =>
                h(SlashMenu, {
                  items: items.value,
                  selectedIndex: selectedIndex.value,
                  onSelect: (item: SlashCommandItem) => {
                    commandCallback?.(item);
                  },
                }),
            });
            vueApp.mount(container);
          }

          return {
            onStart: (props: {
              clientRect?: (() => DOMRect | null) | null;
              items: SlashCommandItem[];
              command: (item: SlashCommandItem) => void;
            }) => {
              items.value = props.items;
              selectedIndex.value = 0;
              commandCallback = props.command;

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

            onUpdate: (props: {
              clientRect?: (() => DOMRect | null) | null;
              items: SlashCommandItem[];
              command: (item: SlashCommandItem) => void;
            }) => {
              items.value = props.items;
              selectedIndex.value = 0;
              commandCallback = props.command;
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
                selectedIndex.value =
                  (selectedIndex.value + 1) % items.value.length;
                mountMenu();
                return true;
              }
              if (event.key === "ArrowUp") {
                selectedIndex.value =
                  (selectedIndex.value - 1 + items.value.length) %
                  items.value.length;
                mountMenu();
                return true;
              }
              if (event.key === "Enter") {
                const item = items.value[selectedIndex.value];
                if (item) {
                  commandCallback?.(item);
                }
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
            },
          };
        },
        command: ({
          editor,
          range,
          props,
        }: {
          editor: import("@tiptap/core").Editor;
          range: { from: number; to: number };
          props: SlashCommandItem;
        }) => {
          editor.chain().focus().deleteRange(range).run();
          onCommand(props.id, editor);
        },
      }),
    ];
  },
});
