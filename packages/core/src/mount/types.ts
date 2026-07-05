// Public option/handle types for the embeddable editor + renderer mount APIs.
export type Json = Record<string, unknown>;

export type Locale = "en" | "ar";
export type Theme = "light" | "dark";

/** Autosave/document lifecycle state, surfaced via onSaveStateChange. */
export type SaveState = "idle" | "saving" | "saved" | "error";

/** Stable error codes passed to onError (string union kept open for additions). */
export type ErrorCode =
  | "doc_too_large"
  | "load_failed"
  | "unauthorized"
  | "network"
  | (string & {});

export interface AutosaveOptions {
  /** Default true. When false, the host drives persistence via save(). */
  enabled?: boolean;
  /** Debounce window in ms. Default 1500. */
  debounceMs?: number;
}

export interface EditorMountOptions {
  /** Existing document id. Omit to lazy-create on first content → onDocumentCreated. */
  documentId?: string;
  /** Initial content when not loading from a documentId (in-memory editing). */
  initialContent?: Json | null;
  locale?: Locale;
  theme?: Theme;
  /** Start read-only. Editing can be toggled later via setEditable(). */
  readOnly?: boolean;
  autofocus?: boolean;
  autosave?: AutosaveOptions;
  /** Fired once the editor is mounted and (if loading) the document is in. */
  onReady?: () => void;
  /** Fired on every content change with the current TipTap JSON. */
  onChange?: (json: Json) => void;
  /** Fired when the autosave/document state transitions. */
  onSaveStateChange?: (state: SaveState) => void;
  /** Fired with the new id when a document is lazy-created. */
  onDocumentCreated?: (id: string) => void;
  /** Fired on recoverable/unrecoverable errors with a stable code. */
  onError?: (code: ErrorCode, detail?: unknown) => void;
  /** Fired when a forced token refresh fails; autosave pauses until recovery. */
  onTokenExpired?: () => void;
  /** Analytics passthrough. */
  onEvent?: (name: string, props?: Record<string, unknown>) => void;
}

export interface EditorInstance {
  /** Current editor content (TipTap JSON). */
  getJSON(): Json | null;
  /**
   * Force an immediate save of any pending changes, awaiting an in-flight save
   * first. Rejects if the save fails (e.g. offline); the failure is also
   * reported via onSaveStateChange('error').
   */
  save(): Promise<void>;
  /** Toggle read-only/editable live. */
  setEditable(editable: boolean): void;
  /** Switch theme live. */
  setTheme(theme: Theme): void;
  /** Tear down the editor and release the shared overlay root. */
  destroy(): void;
}

/**
 * One auth source must be supplied for a renderer. Unlike the editor, the
 * renderer's auth is per-read (signature | token | shareToken), so it stays on
 * the mount call rather than the client — the client only lends its apiUrl.
 */
export interface RendererMountOptions {
  documentId?: string;
  locale?: Locale;
  theme?: Theme;
  onReady?: () => void;
  onError?: (code: ErrorCode, detail?: unknown) => void;
  /** Cross-user read (enrolment-gated): returns a per-doc HMAC signature + exp. */
  getSignature?: () => Promise<{ signature: string; exp: number }>;
  /** Own-document read: returns a short-lived embed token. */
  getToken?: () => Promise<string> | string;
  /** Public read: an existing share token (resolves the doc by token). */
  shareToken?: string;
}

export interface RendererInstance {
  setTheme(theme: Theme): void;
  destroy(): void;
}
