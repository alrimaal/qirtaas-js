// Document CRUD against the data API, transport-agnostic (the host wires the
// concrete transport: embed /v1 with a bearer/signature, or the SPA's /api).
// Mirrors the subset of apps/web's documents store the embed editor/renderer
// and the client's mount-less ops need — create, read, update, list, delete.
import { getTransport } from "./transport";

// documents + images use the data channel (bearer/signature/share, per mode).

export type Json = Record<string, unknown>;

export interface QirtaasDocument {
  id: string;
  title: string;
  content: Json | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateResult extends QirtaasDocument {
  /** Image ids referenced in content that the server refused to link. */
  rejected_image_ids: string[];
}

/** List-item shape: a document without its content. */
export type DocumentSummary = Omit<QirtaasDocument, "content">;

export async function listDocuments(): Promise<DocumentSummary[]> {
  return await getTransport().data.get<DocumentSummary[]>("/documents/");
}

export async function getDocument(id: string): Promise<QirtaasDocument> {
  return await getTransport().data.get<QirtaasDocument>(`/documents/${id}/`);
}

export async function createDocument(
  content?: Json
): Promise<QirtaasDocument> {
  return await getTransport().data.post<QirtaasDocument>(
    "/documents/",
    content ? { content } : {}
  );
}

export async function updateDocument(
  id: string,
  content: Json
): Promise<UpdateResult> {
  const data = await getTransport().data.patch<UpdateResult>(`/documents/${id}/`, {
    content,
  });
  return { ...data, rejected_image_ids: data.rejected_image_ids ?? [] };
}

export async function deleteDocument(id: string): Promise<void> {
  await getTransport().data.delete(`/documents/${id}/`);
}

// Sharing state, owned by the document's author over the bearer channel. The
// token only exists while sharing is on; turning it off revokes it.
export interface ShareInfo {
  is_shared: boolean;
  share_token: string | null;
}

export async function getShareInfo(id: string): Promise<ShareInfo> {
  return await getTransport().data.get<ShareInfo>(`/documents/${id}/share/`);
}

export async function setSharing(
  id: string,
  isShared: boolean
): Promise<ShareInfo> {
  return await getTransport().data.patch<ShareInfo>(`/documents/${id}/share/`, {
    is_shared: isShared,
  });
}

// Public-share read path: a token in the URL, no auth. The shared payload is a
// reduced shape (no status/timestamps).
export interface SharedDocument {
  id: string;
  title: string;
  content: Json | null;
}

export async function getSharedDocument(
  token: string
): Promise<SharedDocument> {
  return await getTransport().data.get<SharedDocument>(
    `/documents/shared/${token}/`
  );
}
