// Standalone document list — no editor mount required, so a host can show the
// identity's documents (id + server-derived title) without keeping its own
// index of ids. Same embed-token channel the editor uses to create/update, so
// listing is symmetric with authoring (the host never proxies document CRUD
// through its own backend).
import { setTransport } from "../services/transport";
import { createEmbedTransport } from "../services/embedTransport";
import { listDocuments as listDocumentsService } from "../services/documents";
import type { DocumentSummary } from "../services/documents";

export type { DocumentSummary };

/**
 * Internal boot options. apiUrl + getToken are resolved by the client; hosts
 * call `createQirtaasClient({ apiUrl, getToken }).listDocuments()`.
 */
export interface ListDocumentsOptions {
  apiUrl: string;
  /** Embed token source — the same the editor uses (shared at the client). */
  getToken: () => Promise<string> | string;
}

export async function listDocuments(
  opts: ListDocumentsOptions
): Promise<DocumentSummary[]> {
  // The transport is a module singleton (one editor per page). Setting it here
  // is safe because listing happens from a list view with no editor mounted.
  setTransport(
    createEmbedTransport({
      apiUrl: opts.apiUrl,
      getToken: opts.getToken,
    })
  );
  return await listDocumentsService();
}
