// @qirtaas/vue — idiomatic Vue 3 components wrapping the @qirtaas/core mount API.
// Re-export the core option/handle types so consumers get typed props/events.
export { default as QirtaasEditor } from "./QirtaasEditor.vue";
export { default as QirtaasRenderer } from "./QirtaasRenderer.vue";

// The configured client (createQirtaasClient) is re-exported for imperative,
// mount-less operations a host needs outside a component — e.g. deleteDocument
// from a list view.
export { createQirtaasClient } from "@qirtaas/core";
export type {
  QirtaasClient,
  QirtaasClientOptions,
  DuplicateDocumentResult,
  DocumentSummary,
  ShareInfo,
} from "@qirtaas/core";

export type {
  EditorMountOptions,
  RendererMountOptions,
  Json,
  Locale,
  Theme,
  SaveState,
  ErrorCode,
  AutosaveOptions,
} from "@qirtaas/core";
