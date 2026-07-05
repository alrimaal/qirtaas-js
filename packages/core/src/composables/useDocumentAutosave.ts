// Debounced document persistence, shared by every editor shell (the SPA's
// DocumentView and the SDK's EmbedEditorApp). It owns ONLY the save mechanics —
// debounce, dirty tracking, in-flight serialization, save state, and the
// before-unload guard. Each shell supplies how to read and persist content, and
// how to surface rejected images / errors, so this stays transport- and
// UI-agnostic. Content itself lives in the shell (it's bound to the editor).
import { ref, onBeforeUnmount, type Ref } from "vue";
import type { Json, SaveState } from "../mount/types";

export interface DocumentAutosaveOptions {
  /** Reads the current content snapshot to persist. */
  getContent: () => Json | null;
  /** Persist the snapshot (create-or-update). Returns rejected image ids, if any. */
  persist: (content: Json) => Promise<{ rejected_image_ids?: string[] } | void>;
  /** Skip persisting when this returns false (e.g. an empty, not-yet-created doc). */
  shouldPersist?: (content: Json | null) => boolean;
  /** Debounce window in ms (default 1500). */
  debounceMs?: number;
  /** When false, edits never schedule a save (host drives saveNow()). */
  enabled?: boolean;
  /** Notified on every save-state transition. */
  onStateChange?: (state: SaveState) => void;
  /** Notified with image ids the server refused to link. */
  onRejectedImages?: (ids: string[]) => void;
  /** Notified when a persist call throws (shell maps to a code / toast). */
  onError?: (err: unknown) => void;
}

export interface DocumentAutosave {
  /** Current save state (reactive). */
  state: Ref<SaveState>;
  /** Mark content dirty and schedule a debounced save. */
  schedule(): void;
  /**
   * Flush any pending change immediately, awaiting an in-flight save first.
   * Rejects if the persist fails (e.g. offline), so callers can react; the
   * failure is also surfaced via `state`/`onError`.
   */
  saveNow(): Promise<void>;
  /** Reset dirty/state/timers — e.g. after loading a fresh document. */
  reset(): void;
  /** Whether there are unsaved changes. */
  isDirty(): boolean;
  /** Pause/resume saving (e.g. suspend while a document is loading). */
  setSuspended(suspended: boolean): void;
}

// How long a "saved" state lingers before falling back to "idle" (drives the
// SPA's transient save indicator; harmless for embed hosts).
const SAVED_IDLE_MS = 2000;

export function useDocumentAutosave(
  opts: DocumentAutosaveOptions
): DocumentAutosave {
  const state = ref<SaveState>("idle");
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;
  let suspended = false;
  let inFlight = false;
  // The persist currently in flight (if any), so an awaited saveNow() can wait
  // for it instead of returning early or starting an overlapping save.
  let inFlightPromise: Promise<void> | null = null;

  function setState(next: SaveState) {
    state.value = next;
    opts.onStateChange?.(next);
  }
  function clearSaveTimer() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
  }
  function clearIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
  }

  // The actual persist. Rejects if the save fails so an awaited saveNow() can
  // react; failures are still surfaced via state + onError for the autosave path.
  async function runPersist(): Promise<void> {
    clearSaveTimer();
    const content = opts.getContent();
    if (opts.shouldPersist && !opts.shouldPersist(content)) return;

    inFlight = true;
    dirty = false;
    setState("saving");
    try {
      const result = await opts.persist(content ?? {});
      const rejected = (result && result.rejected_image_ids) || [];
      if (rejected.length) opts.onRejectedImages?.(rejected);
      setState("saved");
      clearIdleTimer();
      idleTimer = setTimeout(() => setState("idle"), SAVED_IDLE_MS);
    } catch (err) {
      dirty = true; // keep the change pending; the user can retry
      setState("error");
      opts.onError?.(err);
      throw err; // propagate so an awaited saveNow() sees the failure
    } finally {
      inFlight = false;
      // Edits that arrived mid-save left dirty=true → fold them into a new save.
      if (dirty && !suspended && state.value !== "error") schedule();
    }
  }

  async function saveNow(): Promise<void> {
    // Serialize against any save already running: await it rather than returning
    // early, so an awaited saveNow() reflects the in-flight persist and we never
    // overlap two saves (which also stops a lazy-create racing into two docs).
    // Its rejection is swallowed here — this call re-attempts below if changes
    // are still pending after it settles.
    while (inFlightPromise) {
      await inFlightPromise.catch(() => {});
    }
    if (suspended || !dirty) return;

    inFlightPromise = runPersist();
    try {
      await inFlightPromise;
    } finally {
      inFlightPromise = null;
    }
  }

  function schedule(): void {
    if (opts.enabled === false) return;
    clearSaveTimer();
    clearIdleTimer();
    dirty = true;
    setState("idle");
    // Autosave is fire-and-forget; failures surface via state/onError, so the
    // (now rejectable) saveNow must not produce an unhandled rejection here.
    saveTimer = setTimeout(() => void saveNow().catch(() => {}), opts.debounceMs ?? 1500);
  }

  function reset(): void {
    clearSaveTimer();
    clearIdleTimer();
    dirty = false;
    setState("idle");
  }

  function beforeUnload(e: BeforeUnloadEvent) {
    if (dirty) e.preventDefault();
  }
  window.addEventListener("beforeunload", beforeUnload);
  onBeforeUnmount(() => {
    window.removeEventListener("beforeunload", beforeUnload);
    clearSaveTimer();
    clearIdleTimer();
  });

  return {
    state,
    schedule,
    saveNow,
    reset,
    isDirty: () => dirty,
    setSuspended: (v: boolean) => {
      suspended = v;
    },
  };
}
