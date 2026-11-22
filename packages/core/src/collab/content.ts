import { yXmlFragmentToProsemirrorJSON } from "@tiptap/y-tiptap";
import type * as Y from "yjs";

/** Y.XmlFragment holding the document. Editor, collab server and flip script all use it. */
export const COLLAB_FIELD = "default";

/** ProseMirror JSON of a collab doc. */
export function collabContent(ydoc: Y.Doc): Record<string, unknown> {
  return yXmlFragmentToProsemirrorJSON(ydoc.getXmlFragment(COLLAB_FIELD));
}
