// Pure TipTap-JSON shape helpers, free of any app/feature coupling. Used by the
// embed editor (lazy-create empty guard) and the SPA (tutorial progression).

/** Check if a TipTap JSON doc has no meaningful content (only empty paragraphs / hard breaks). */
export function docIsEmpty(json: Record<string, unknown>): boolean {
  const content = json.content as Record<string, unknown>[] | undefined;
  if (!content || content.length === 0) return true;
  return content.every((node) => node.type === "paragraph" && !node.content);
}

/** Check if a TipTap JSON doc contains a node of the given type. */
export function docContainsNode(
  json: Record<string, unknown>,
  nodeType: string
): boolean {
  if (json.type === nodeType) return true;
  const content = json.content as Record<string, unknown>[] | undefined;
  if (content) {
    return content.some((child) => docContainsNode(child, nodeType));
  }
  return false;
}
