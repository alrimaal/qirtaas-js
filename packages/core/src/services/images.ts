import axios from "axios";
import { getTransport } from "./transport";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export interface UploadTicket {
  image_id: string;
  upload_url: string;
}

export async function requestUploadUrl(
  filename: string,
  contentType: string,
): Promise<UploadTicket> {
  return await getTransport().data.post<UploadTicket>(
    "/documents/images/upload/",
    { filename, content_type: contentType },
  );
}

export async function uploadToPresignedUrl(
  url: string,
  file: File,
): Promise<void> {
  await axios.put(url, file, {
    headers: { "Content-Type": file.type },
  });
}

export async function confirmUpload(imageId: string): Promise<void> {
  await getTransport().data.post(`/documents/images/${imageId}/confirm/`);
}

// Backend signs presigned URLs for 2h. Cache slightly shorter to leave a
// safety margin against clock skew and in-flight latency.
const URL_CACHE_TTL_MS = 90 * 60 * 1000;

const urlCache = new Map<string, { url: string; expiresAt: number }>();

export function invalidateImageUrl(imageId: string): void {
  urlCache.delete(imageId);
}

export async function getImageUrl(
  imageId: string,
  documentId?: string,
): Promise<string> {
  const cached = urlCache.get(imageId);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const data = await getTransport().data.get<{ download_url: string }>(
    `/documents/images/${imageId}/url/`,
    { params: documentId ? { document_id: documentId } : undefined },
  );
  const url = data.download_url;
  urlCache.set(imageId, { url, expiresAt: Date.now() + URL_CACHE_TTL_MS });
  return url;
}
