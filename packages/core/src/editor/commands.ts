import type { Editor } from "@tiptap/core";
import { HONORIFICS } from "./honorifics";
import { mod, modShift, type Combo } from "./keyboard";

export type CommandGroup =
  | "insert"
  | "honorifics"
  | "format"
  | "highlight"
  | "tools";

export const HIGHLIGHT_COLORS = [
  { id: "yellow", light: "#fef08a", dark: "#ca8a04" },
  { id: "green", light: "#bbf7d0", dark: "#15803d" },
  { id: "blue", light: "#bfdbfe", dark: "#1d4ed8" },
  { id: "pink", light: "#fbcfe8", dark: "#be185d" },
  { id: "orange", light: "#fed7aa", dark: "#c2410c" },
  { id: "purple", light: "#e9d5ff", dark: "#7e22ce" },
] as const;

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export function insertToggleList(editor: Editor) {
  const { $from } = editor.state.selection;
  if ($from.depth === 1 && $from.index(0) === 0) {
    editor
      .chain()
      .focus()
      .command(({ tr, state }) => {
        tr.insert(0, state.schema.nodes.paragraph!.create());
        return true;
      })
      .setTextSelection($from.pos + 2)
      .setDetails()
      .run();
  } else {
    editor.chain().focus().setDetails().run();
  }
}

function setAlign(editor: Editor, align: "left" | "center" | "right") {
  const chain = editor.chain().focus();
  if (editor.isActive({ textAlign: align })) chain.unsetTextAlign().run();
  else chain.setTextAlign(align).run();
}

export interface CommandDef {
  id: string;
  group: CommandGroup;
  icon: string;
  labelKey?: string;
  labelText?: { en: string; ar: string };
  glyph?: string;

  searchTerms?: string[];
  syntax?: string;

  combo?: Combo;

  swatch?: HighlightColor;

  slash?: boolean;

  palette?: boolean;
  run?: (editor: Editor) => void;
  isActive?: (editor: Editor) => boolean;
}

const INSERT_COMMANDS: CommandDef[] = [
  {
    id: "quran",
    group: "insert",
    labelKey: "editor.insertQuran",
    icon: "pi pi-book",
    syntax: "/quran",
    slash: true,
    palette: true,
  },
  {
    id: "hadith",
    group: "insert",
    labelKey: "editor.insertHadith",
    icon: "pi pi-comment",
    syntax: "/hadith",
    slash: true,
    palette: true,
  },
  {
    id: "page",
    group: "insert",
    labelKey: "editor.pageLink.pickerTitle",
    icon: "pi pi-file",
    syntax: "/page",
    slash: true,
    palette: true,
  },
  {
    id: "table",
    group: "insert",
    labelKey: "editor.insertTable",
    icon: "pi pi-table",
    palette: true,
  },
];

const HONORIFIC_COMMANDS: CommandDef[] = HONORIFICS.map((h) => ({
  id: h.id,
  group: "honorifics" as const,
  labelText: { en: h.en, ar: h.ar },
  icon: "pi pi-pencil",
  glyph: h.glyph,
  searchTerms: [h.en.toLowerCase(), h.ar, ...h.shortcodes, ...h.tags],
  syntax: `:${h.shortcodes[0]}:`,
  slash: true,
  palette: true,
}));

const FORMAT_COMMANDS: CommandDef[] = [
  {
    id: "bold",
    group: "format",
    labelKey: "editor.tooltips.bold",
    icon: "pi pi-bold",
    combo: mod("B"),
    palette: true,
    run: (e) => e.chain().focus().toggleBold().run(),
    isActive: (e) => e.isActive("bold"),
  },
  {
    id: "italic",
    group: "format",
    labelKey: "editor.tooltips.italic",
    icon: "pi pi-italic",
    combo: mod("I"),
    palette: true,
    run: (e) => e.chain().focus().toggleItalic().run(),
    isActive: (e) => e.isActive("italic"),
  },
  {
    id: "underline",
    group: "format",
    labelKey: "editor.tooltips.underline",
    icon: "pi pi-underline",
    combo: mod("U"),
    palette: true,
    run: (e) => e.chain().focus().toggleUnderline().run(),
    isActive: (e) => e.isActive("underline"),
  },
  {
    id: "strike",
    group: "format",
    labelKey: "editor.tooltips.strikethrough",
    icon: "pi pi-minus",
    combo: modShift("S"),
    palette: true,
    run: (e) => e.chain().focus().toggleStrike().run(),
    isActive: (e) => e.isActive("strike"),
  },
  {
    id: "heading1",
    group: "format",
    labelKey: "editor.shortcuts.blocks.heading1",
    icon: "pi pi-hashtag",
    syntax: "#",
    palette: true,
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (e) => e.isActive("heading", { level: 1 }),
  },
  {
    id: "heading2",
    group: "format",
    labelKey: "editor.shortcuts.blocks.heading2",
    icon: "pi pi-hashtag",
    syntax: "##",
    palette: true,
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (e) => e.isActive("heading", { level: 2 }),
  },
  {
    id: "heading3",
    group: "format",
    labelKey: "editor.shortcuts.blocks.heading3",
    icon: "pi pi-hashtag",
    syntax: "###",
    palette: true,
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (e) => e.isActive("heading", { level: 3 }),
  },
  {
    id: "bulletList",
    group: "format",
    labelKey: "editor.tooltips.bulletList",
    icon: "pi pi-list",
    syntax: "*",
    palette: true,
    run: (e) => e.chain().focus().toggleBulletList().run(),
    isActive: (e) => e.isActive("bulletList"),
  },
  {
    id: "orderedList",
    group: "format",
    labelKey: "editor.tooltips.orderedList",
    icon: "pi pi-sort-numeric-down",
    syntax: "1.",
    palette: true,
    run: (e) => e.chain().focus().toggleOrderedList().run(),
    isActive: (e) => e.isActive("orderedList"),
  },
  {
    id: "toggleList",
    group: "format",
    labelKey: "editor.insertToggleList",
    icon: "pi pi-chevron-right",
    palette: true,
    run: insertToggleList,
  },
  {
    id: "blockquote",
    group: "format",
    labelKey: "editor.tooltips.blockquote",
    icon: "pi pi-align-right",
    syntax: ">",
    palette: true,
    run: (e) => e.chain().focus().toggleBlockquote().run(),
    isActive: (e) => e.isActive("blockquote"),
  },
  {
    id: "alignLeft",
    group: "format",
    labelKey: "editor.align.left",
    icon: "pi pi-align-left",
    palette: true,
    run: (e) => setAlign(e, "left"),
    isActive: (e) => e.isActive({ textAlign: "left" }),
  },
  {
    id: "alignCenter",
    group: "format",
    labelKey: "editor.align.center",
    icon: "pi pi-align-center",
    palette: true,
    run: (e) => setAlign(e, "center"),
    isActive: (e) => e.isActive({ textAlign: "center" }),
  },
  {
    id: "alignRight",
    group: "format",
    labelKey: "editor.align.right",
    icon: "pi pi-align-right",
    palette: true,
    run: (e) => setAlign(e, "right"),
    isActive: (e) => e.isActive({ textAlign: "right" }),
  },
];

const HIGHLIGHT_COMMANDS: CommandDef[] = [
  ...HIGHLIGHT_COLORS.map((c) => ({
    id: `highlight-${c.id}`,
    group: "highlight" as const,
    labelKey: `editor.highlights.${c.id}`,
    icon: "pi pi-palette",
    swatch: c,
    searchTerms: ["highlight", "color", "colour", c.id],
    palette: true,
    run: (e: Editor) => e.chain().focus().toggleHighlight({ color: c.light }).run(),
    isActive: (e: Editor) => e.isActive("highlight", { color: c.light }),
  })),
  {
    id: "highlightRemove",
    group: "highlight",
    labelKey: "editor.highlights.remove",
    icon: "pi pi-ban",
    palette: true,
    run: (e) => e.chain().focus().unsetHighlight().run(),
  },
];

const TOOL_COMMANDS: CommandDef[] = [
  {
    id: "findReplace",
    group: "tools",
    labelKey: "editor.findReplace.title",
    icon: "pi pi-search",
    combo: mod("F"),
    palette: true,
  },
  {
    id: "shortcuts",
    group: "tools",
    labelKey: "editor.shortcuts.tooltip",
    icon: "pi pi-question-circle",
    palette: true,
  },
];

export const COMMAND_DEFS: CommandDef[] = [
  ...INSERT_COMMANDS,
  ...HONORIFIC_COMMANDS,
  ...FORMAT_COMMANDS,
  ...HIGHLIGHT_COMMANDS,
  ...TOOL_COMMANDS,
];

export interface ResolvedCommand {
  id: string;
  group: CommandGroup;
  label: string;
  searchTerms: string[];
  icon: string;
  glyph?: string;
  syntax?: string;
  combo?: Combo;
  swatch?: HighlightColor;
  run?: (editor: Editor) => void;
  toggleable: boolean;
}

export interface BuildOptions {
  locale: string;
  t: (key: string) => string;
  surface: "slash" | "palette";
  commandFilter?: (id: string) => boolean;
}

export function buildCommands({
  locale,
  t,
  surface,
  commandFilter = () => true,
}: BuildOptions): ResolvedCommand[] {
  const isAr = locale === "ar";
  return COMMAND_DEFS.filter(
    (cmd) => (surface === "slash" ? cmd.slash : cmd.palette) && commandFilter(cmd.id),
  ).map((cmd) => {
    const label = cmd.labelKey
      ? t(cmd.labelKey)
      : isAr
        ? cmd.labelText!.ar
        : cmd.labelText!.en;
    return {
      id: cmd.id,
      group: cmd.group,
      label,
      searchTerms: [
        label.toLowerCase(),
        t(`editor.commandPalette.groups.${cmd.group}`).toLowerCase(),
        ...(cmd.searchTerms ?? []),
        ...(cmd.syntax ? [cmd.syntax.toLowerCase()] : []),
      ],
      icon: cmd.icon,
      glyph: cmd.glyph,
      syntax: cmd.syntax,
      combo: cmd.combo,
      swatch: cmd.swatch,
      run: cmd.run,
      toggleable: !!cmd.isActive,
    };
  });
}

export function filterCommands(
  commands: ResolvedCommand[],
  query: string,
): ResolvedCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter((cmd) => cmd.searchTerms.some((term) => term.includes(q)));
}
