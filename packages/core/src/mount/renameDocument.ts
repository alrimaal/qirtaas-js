import { setTransport } from "../services/transport";
import { createEmbedTransport } from "../services/embedTransport";
import {
  renameDocument as renameDocumentService,
  type QirtaasDocument,
} from "../services/documents";

export type { QirtaasDocument };

export interface RenameDocumentOptions {
  apiUrl: string;
  documentId: string;
  title: string;
  getToken: () => Promise<string> | string;
}

export async function renameDocument(
  opts: RenameDocumentOptions
): Promise<QirtaasDocument> {
  setTransport(
    createEmbedTransport({
      apiUrl: opts.apiUrl,
      getToken: opts.getToken,
    })
  );
  return await renameDocumentService(opts.documentId, opts.title);
}
