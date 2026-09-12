import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import tippy, { type Instance as TippyInstance } from "tippy.js";

const SlashCommandPluginKey = new PluginKey("slashCommand");
import { VueRenderer } from "@tiptap/vue-3";
import { getOverlayTarget } from "../../mount/overlay";
import SlashMenu from "../SlashMenu.vue";
import { buildCommands, filterCommands, type ResolvedCommand } from "../commands";

export type SlashCommandItem = ResolvedCommand;

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      locale: "en" as string,
      translate: ((key: string) => key) as (key: string) => string,
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
    const editor = this.editor;
    const onCommand = this.options.onCommand;
    const commands = buildCommands({
      locale: this.options.locale,
      t: this.options.translate,
      surface: "slash",
      commandFilter: this.options.commandFilter,
    });

    return [
      Suggestion({
        pluginKey: SlashCommandPluginKey,
        editor: this.editor,
        char: "/",
        startOfLine: false,
        items: ({ query }: { query: string }): SlashCommandItem[] =>
          filterCommands(commands, query),
        render: () => {
          let tippyInstance: TippyInstance | null = null;
          let renderer: VueRenderer | null = null;
          let selectedIndex = 0;
          let items: SlashCommandItem[] = [];
          let commandCallback: ((item: SlashCommandItem) => void) | null = null;

          // Patches the mounted menu's props; Vue diffs from there. The menu
          // is created once per session, in onStart.
          const paint = () => renderer?.updateProps({ items, selectedIndex });

          return {
            onStart: (props: {
              clientRect?: (() => DOMRect | null) | null;
              items: SlashCommandItem[];
              command: (item: SlashCommandItem) => void;
            }) => {
              items = props.items;
              selectedIndex = 0;
              commandCallback = props.command;

              // VueRenderer (not createApp) so the menu inherits the host
              // app's context — i18n, PrimeVue, provides — via editor.appContext.
              renderer = new VueRenderer(SlashMenu, {
                editor,
                props: {
                  items,
                  selectedIndex,
                  onSelect: (item: SlashCommandItem) => commandCallback?.(item),
                },
              });

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

            onUpdate: (props: {
              clientRect?: (() => DOMRect | null) | null;
              items: SlashCommandItem[];
              command: (item: SlashCommandItem) => void;
            }) => {
              items = props.items;
              selectedIndex = 0;
              commandCallback = props.command;
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
                selectedIndex =
                  (selectedIndex - 1 + items.length) % items.length;
                paint();
                return true;
              }
              if (event.key === "Enter") {
                const item = items[selectedIndex];
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
              renderer?.destroy();
              tippyInstance = null;
              renderer = null;
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
