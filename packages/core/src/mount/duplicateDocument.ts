// Standalone document duplicate — no editor mount required. Reads a document's
// content and creates a fresh copy, returning the new id. Used by hosts that
// keep a stable published document while the author revises a private clone
// (e.g. CaaS lesson documents: clone the published doc into a draft to edit).
// Same embed-token channel the editor uses to create/update, so this is
// symmetric with authoring (the host never proxies document CRUD).
import { setTransport } from "../services/transport";
import { createEmbedTransport } from "../services/embedTransport";
import {
  getDocument,
  createDocument,
} from "../services/documents";

/**
 * Internal boot options. apiUrl + getToken are resolved by the client; hosts
 * call `createQirtaasClient({ apiUrl, getToken }).duplicateDocument(documentId)`.
 */
export interface DuplicateDocumentOptions {
  apiUrl: string;
  documentId: string;
  /** Embed token source — the same the editor uses (shared at the client). */
  getToken: () => Promise<string> | string;
}

/** Result of a duplicate: the new document's id. */
export interface DuplicateDocumentResult {
  id: string;
}

export async function duplicateDocument(
  opts: DuplicateDocumentOptions
): Promise<DuplicateDocumentResult> {
  // The transport is a module singleton (one editor per page). Setting it here
  // is safe because duplication happens from a list/lesson view with no editor
  // mounted.
  setTransport(
    createEmbedTransport({
      apiUrl: opts.apiUrl,
      getToken: opts.getToken,
    })
  );
  const source = await getDocument(opts.documentId);
  const copy = await createDocument(source.content ?? undefined);
  return { id: copy.id };
}
