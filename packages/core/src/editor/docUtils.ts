// Pure TipTap-JSON shape helpers, free of any app/feature coupling. Used by the
// embed editor's lazy-create empty guard.

/** Check if a TipTap JSON doc has no meaningful content (only empty paragraphs / hard breaks). */
export function docIsEmpty(json: Record<string, unknown>): boolean {
  const content = json.content as Record<string, unknown>[] | undefined;
  if (!content || content.length === 0) return true;
  return content.every((node) => node.type === "paragraph" && !node.content);
}
