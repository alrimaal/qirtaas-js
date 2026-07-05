// Configured client for @qirtaas/core — the SDK's public entry point. Bundles
// the connection (apiUrl) and the embed-token source once, then exposes the
// mount/delete operations bound to that config. This is the "configure once"
// shape (Stripe/Supabase style) that replaces the old free functions which each
// re-took apiUrl + getToken per call.
//
// The editor and deleteDocument share the embed `getToken`. The RENDERER does
// not: its auth is per-read (signature | token | shareToken) and is supplied
// per mountRenderer call — the client only lends the renderer its apiUrl.
import { mountEditor } from "./mount/editor";
import { mountRenderer } from "./mount/renderer";
import { deleteDocument } from "./mount/deleteDocument";
import { duplicateDocument } from "./mount/duplicateDocument";
import type { DuplicateDocumentResult } from "./mount/duplicateDocument";
import { listDocuments } from "./mount/listDocuments";
import type { DocumentSummary } from "./mount/listDocuments";
import { getShareInfo, setSharing } from "./mount/sharing";
import type { ShareInfo } from "./mount/sharing";
import type {
  EditorMountOptions,
  EditorInstance,
  RendererMountOptions,
  RendererInstance,
} from "./mount/types";

const DEFAULT_API_URL = "https://api.qirtaas.io";

export interface QirtaasClientOptions {
  /** Qirtaas API base URL. Default: https://api.qirtaas.io */
  apiUrl?: string;
  /**
   * Returns a short-lived embed token, shared by the editor and the mount-less
   * ops (listDocuments, deleteDocument, duplicateDocument; called on init,
   * before exp, and on 401). Optional: a renderer-only client — which carries
   * its own per-read auth — can omit it; the editor and the mount-less ops
   * throw if it is missing.
   */
  getToken?: () => Promise<string> | string;
}

export interface QirtaasClient {
  /** Boot the editor onto a host node, authorized by the client's getToken. */
  mountEditor(el: Element | string, options?: EditorMountOptions): EditorInstance;
  /** Boot the read-only renderer; auth (signature/token/shareToken) is per-call. */
  mountRenderer(el: Element | string, options: RendererMountOptions): RendererInstance;
  /**
   * List the identity's documents (id + server-derived title, no content) over
   * the embed-token channel — lets a host render a document list without
   * keeping its own index of ids.
   */
  listDocuments(): Promise<DocumentSummary[]>;
  /** Delete a document over the embed-token channel (no mount required). */
  deleteDocument(documentId: string): Promise<void>;
  /**
   * Copy a document's content into a new document, returning the new id. Lets a
   * host keep a stable published document while the author edits a private clone.
   */
  duplicateDocument(documentId: string): Promise<DuplicateDocumentResult>;
  /** Read a document's sharing state (and token, if shared) over the embed-token channel. */
  getShareInfo(documentId: string): Promise<ShareInfo>;
  /**
   * Turn public sharing on or off. Enabling mints (or returns the existing)
   * share token — pass it to `mountRenderer({ shareToken })` for public reads.
   * Disabling revokes it.
   */
  setSharing(documentId: string, isShared: boolean): Promise<ShareInfo>;
}

export function createQirtaasClient(config: QirtaasClientOptions = {}): QirtaasClient {
  const apiUrl = config.apiUrl ?? DEFAULT_API_URL;

  // The editor and delete need the embed token; resolve it lazily with a clear
  // error so a renderer-only client can still be created without a getToken.
  const requireToken = (op: string): (() => Promise<string> | string) => {
    if (!config.getToken) {
      throw new Error(
        `Qirtaas: ${op} requires a getToken — pass it to createQirtaasClient({ getToken }).`
      );
    }
    return config.getToken;
  };

  return {
    mountEditor: (el, options = {}) =>
      mountEditor(el, {
        ...options,
        apiUrl,
        getToken: requireToken("mountEditor"),
      }),
    mountRenderer: (el, options) => mountRenderer(el, { ...options, apiUrl }),
    listDocuments: () =>
      listDocuments({ apiUrl, getToken: requireToken("listDocuments") }),
    deleteDocument: (documentId) =>
      deleteDocument({ apiUrl, documentId, getToken: requireToken("deleteDocument") }),
    duplicateDocument: (documentId) =>
      duplicateDocument({
        apiUrl,
        documentId,
        getToken: requireToken("duplicateDocument"),
      }),
    getShareInfo: (documentId) =>
      getShareInfo({ apiUrl, documentId, getToken: requireToken("getShareInfo") }),
    setSharing: (documentId, isShared) =>
      setSharing({
        apiUrl,
        documentId,
        isShared,
        getToken: requireToken("setSharing"),
      }),
  };
}
