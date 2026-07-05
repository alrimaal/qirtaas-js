// Public API for @qirtaas/core — the embeddable editor SDK.
// Side-effect import: pulls the embed stylesheet into the bundle. In the lib
// build it's extracted to dist/qirtaas.css and auto-injected by JS; in dev
// (source consumers) Vite injects it. The SPA imports core only via deep
// subpaths, never this entry, so it never picks up the embed styles.
// PrimeIcons first (its fonts inline into the built CSS), then the embed reset
// + utilities.
import "primeicons/primeicons.css";
import "./styles/embed.css";

export { createQirtaasClient } from "./client";
export type { QirtaasClient, QirtaasClientOptions } from "./client";
export type { DuplicateDocumentResult } from "./mount/duplicateDocument";
export type { DocumentSummary } from "./mount/listDocuments";
export type { ShareInfo } from "./mount/sharing";

export type {
  EditorMountOptions,
  EditorInstance,
  RendererMountOptions,
  RendererInstance,
  Json,
  Locale,
  Theme,
  SaveState,
  ErrorCode,
  AutosaveOptions,
} from "./mount/types";
