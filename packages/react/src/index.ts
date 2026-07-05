// @qirtaas/react — idiomatic React components wrapping the @qirtaas/core mount
// API. Vue is bundled in (a React host supplies none); only React is a peer.
export { QirtaasEditor } from "./QirtaasEditor";
export type { QirtaasEditorProps, QirtaasEditorHandle } from "./QirtaasEditor";
export { QirtaasRenderer } from "./QirtaasRenderer";
export type {
  QirtaasRendererProps,
  QirtaasRendererHandle,
} from "./QirtaasRenderer";

// The configured client, for imperative mount-less ops (e.g. deleteDocument
// from a list view) outside a component.
export { createQirtaasClient } from "@qirtaas/core";
export type {
  QirtaasClient,
  QirtaasClientOptions,
  DuplicateDocumentResult,
  DocumentSummary,
  ShareInfo,
} from "@qirtaas/core";

export type {
  Json,
  Locale,
  Theme,
  SaveState,
  ErrorCode,
  AutosaveOptions,
} from "@qirtaas/core";
