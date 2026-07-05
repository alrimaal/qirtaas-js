// Standalone sharing controls — no editor mount required, so a host can put a
// "share" action on a list/detail view. Turning sharing on mints (or returns
// the existing) opaque share token; turning it off revokes it. The token is
// what the renderer's public read mode consumes (`mountRenderer({ shareToken })`).
// Same embed-token channel the editor uses to create/update, so sharing is
// symmetric with authoring (the host never proxies document CRUD).
import { setTransport } from "../services/transport";
import { createEmbedTransport } from "../services/embedTransport";
import {
  getShareInfo as getShareInfoService,
  setSharing as setSharingService,
} from "../services/documents";
import type { ShareInfo } from "../services/documents";

export type { ShareInfo };

/**
 * Internal boot options. apiUrl + getToken are resolved by the client; hosts
 * call `createQirtaasClient({ apiUrl, getToken }).setSharing(documentId, isShared)`
 * or `.getShareInfo(documentId)`.
 */
export interface SharingOptions {
  apiUrl: string;
  documentId: string;
  /** Embed token source — the same the editor uses (shared at the client). */
  getToken: () => Promise<string> | string;
}

export async function getShareInfo(opts: SharingOptions): Promise<ShareInfo> {
  // The transport is a module singleton (one editor per page). Setting it here
  // is safe because share actions happen from list/detail chrome; an editor
  // mounted alongside uses the same apiUrl + token, so the transports match.
  setTransport(
    createEmbedTransport({
      apiUrl: opts.apiUrl,
      getToken: opts.getToken,
    })
  );
  return await getShareInfoService(opts.documentId);
}

export async function setSharing(
  opts: SharingOptions & { isShared: boolean }
): Promise<ShareInfo> {
  setTransport(
    createEmbedTransport({
      apiUrl: opts.apiUrl,
      getToken: opts.getToken,
    })
  );
  return await setSharingService(opts.documentId, opts.isShared);
}
