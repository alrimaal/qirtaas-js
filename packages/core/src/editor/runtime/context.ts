// Editor runtime context: reactive, per-instance DI seams that let the editor
// run both inside the Qirtaas SPA (host provides real values) and as the
// embedded SDK (host provides via mount options). Reactive/per-instance state
// uses Vue inject (here); global side-effecting sinks (analytics, transport)
// use module singletons instead. Each seam has a safe default.
import { inject, ref, type InjectionKey, type Ref } from "vue";

/**
 * Read-only dark-mode flag. The host owns theme state (SPA: useTheme();
 * embed SDK later: options.theme), so the editor only consumes it.
 * Default: light.
 */
export const IsDarkKey: InjectionKey<Ref<boolean>> = Symbol(
  "qirtaas.editor.isDark"
);

export function useIsDark(): Ref<boolean> {
  return inject(IsDarkKey, ref(false));
}

export interface DocumentLinkDocMeta {
  id: string;
  title: string;
  updated_at?: string;
}

/**
 * Host capabilities behind the page-link (documentLink) feature: listing and
 * searching the user's documents, creating one, and navigating to one. Hosts
 *  that can't (embed SDK, shared read-only view) simply don't provide it — the
 * default disables the /page command, and existing chips render from their
 * persisted label snapshot, non-clickable.
 */
export interface DocumentLinkHost {
  enabled: boolean;
  /** Reactive doc list; chips resolve live titles from it so renames
   *  propagate without any extra fetch. */
  documents: Ref<DocumentLinkDocMeta[]>;
  searchDocuments(query: string): Promise<DocumentLinkDocMeta[]>;
  createDocument(): Promise<DocumentLinkDocMeta>;
  openDocument(id: string): void;
}

const DISABLED_DOCUMENT_LINK_HOST: DocumentLinkHost = {
  enabled: false,
  documents: ref([]),
  searchDocuments: async () => [],
  createDocument: () => {
    throw new Error("documentLink host not provided");
  },
  openDocument: () => {},
};

export const DocumentLinkHostKey: InjectionKey<DocumentLinkHost> = Symbol(
  "qirtaas.editor.documentLinkHost"
);

export function useDocumentLinkHost(): DocumentLinkHost {
  return inject(DocumentLinkHostKey, DISABLED_DOCUMENT_LINK_HOST);
}
