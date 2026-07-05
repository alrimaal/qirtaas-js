// Standalone document delete — no editor mount required, so a host can remove a
// document from a list/grid where no editor is on screen. Same embed-token
// channel the editor uses to create/update, so deletion is symmetric with
// authoring (the host never proxies document CRUD through its own backend).
import { setTransport } from "../services/transport";
import { createEmbedTransport } from "../services/embedTransport";
import { deleteDocument as deleteDocumentService } from "../services/documents";

/**
 * Internal boot options. apiUrl + getToken are resolved by the client; hosts
 * call `createQirtaasClient({ apiUrl, getToken }).deleteDocument(documentId)`.
 */
export interface DeleteDocumentOptions {
  apiUrl: string;
  documentId: string;
  /** Embed token source — the same the editor uses (shared at the client). */
  getToken: () => Promise<string> | string;
}

export async function deleteDocument(opts: DeleteDocumentOptions): Promise<void> {
  // The transport is a module singleton (one editor per page). Setting it here
  // is safe because deletion happens from a list view with no editor mounted.
  setTransport(
    createEmbedTransport({
      apiUrl: opts.apiUrl,
      getToken: opts.getToken,
    })
  );
  await deleteDocumentService(opts.documentId);
}
