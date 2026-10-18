import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Emoji, { gitHubEmojis } from "@tiptap/extension-emoji";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import {
  Table,
  TableRow,
  TableHeader,
  TableCell,
} from "@tiptap/extension-table";
import {
  Details,
  DetailsSummary,
  DetailsContent,
} from "@tiptap/extension-details";
import { TextDirection } from "./TextDirection";
import { QuranVerse } from "./QuranVerse";
import { QuranMushaf } from "./QuranMushaf";
import { HadithNode } from "./HadithNode";
import { DocumentLink } from "./DocumentLink";
import { Honorific } from "./Honorific";
import { ImageNode } from "./ImageNode";
import { TextColor } from "./TextColor";
import type { emojiSuggestion } from "../emojiSuggestion";

/** Every node, mark and node view a document can contain. Shared by the
 *  editor and the renderer so both accept exactly the same content. */
export function documentExtensions(opts: {
  documentId?: string;
  translate: (key: string) => string;
  /** Editor only: the `:` emoji picker. */
  emojiSuggestion?: typeof emojiSuggestion;
}): Extensions {
  return [
    StarterKit.configure({}),
    TextDirection.configure({
      types: ["heading", "paragraph", "listItem", "taskItem"],
    }),
    Emoji.configure({
      emojis: gitHubEmojis,
      enableEmoticons: !!opts.emojiSuggestion,
      ...(opts.emojiSuggestion ? { suggestion: opts.emojiSuggestion } : {}),
    }),
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    Highlight.configure({
      multicolor: true,
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Underline,
    TextColor,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        rel: "noopener noreferrer",
        target: "_blank",
      },
    }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Details.configure({
      persist: true,
      HTMLAttributes: { dir: "auto" },
    }),
    DetailsSummary,
    DetailsContent,
    QuranVerse,
    QuranMushaf,
    HadithNode,
    DocumentLink,
    Honorific,
    ImageNode.configure({
      documentId: opts.documentId,
      translate: opts.translate,
    }),
  ];
}
