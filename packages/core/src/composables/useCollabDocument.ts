import {
  ref,
  shallowRef,
  watch,
  onBeforeUnmount,
  type Ref,
  type ShallowRef,
} from "vue";
import { WebSocketStatus } from "@hocuspocus/provider";
import type { CollabHandle, CollabManager } from "../collab/CollabManager";
import type { SaveState } from "../mount/types";

export interface CollabStored {
  title: string;
  updated_at: string;
}

export interface CollabDocument {
  /** Set once acquired; null while `name` is null. */
  handle: ShallowRef<CollabHandle | null>;
  /** First handshake with the server done (content loaded). */
  synced: Ref<boolean>;
  status: Ref<WebSocketStatus>;
  /** Updates not yet acked by the server. */
  unsyncedChanges: Ref<number>;
  state: Ref<SaveState>;
  /** Browser offline after loading. */
  offline: Ref<boolean>;
  /** Resolves once `name`'s content is loaded, or `name` changes. */
  whenSynced(): Promise<void>;
}

const SAVED_IDLE_MS = 2000;
// Edits are acked per keystroke; only report once typing pauses or a send lags.
const SETTLE_MS = 1000;

/** Binds a component to `manager` for the doc `name` (null = none). */
export function useCollabDocument(
  name: Ref<string | null>,
  opts: {
    manager: CollabManager;
    onStored?: (stored: CollabStored) => void;
    onTooLarge?: () => void;
  }
): CollabDocument {
  const handle = shallowRef<CollabHandle | null>(null);
  const synced = ref(false);
  const status = ref<WebSocketStatus>(WebSocketStatus.Disconnected);
  const unsyncedChanges = ref(0);
  const state = ref<SaveState>("idle");
  const tooLarge = ref(false);
  const offline = ref(false);
  let stateTimer: ReturnType<typeof setTimeout> | null = null;
  // Edits made since the last "saved".
  let pending = false;
  let unbind: (() => void) | null = null;
  let everSynced = false;
  let boundName: string | null = null;
  let syncWaiters: { name: string; resolve: () => void }[] = [];

  function setState(next: SaveState) {
    if (stateTimer) clearTimeout(stateTimer);
    stateTimer = null;
    state.value = next;
  }

  function updateState() {
    // Initial load isn't a save.
    if (!everSynced) return setState("idle");
    if (tooLarge.value) {
      pending = true;
      return setState("error");
    }
    if (unsyncedChanges.value > 0) {
      pending = true;
      if (status.value !== WebSocketStatus.Connected) {
        // Local edits are safe offline; `offline` covers the UI.
        return setState(handle.value?.isLocal() ? "idle" : "error");
      }
      setState(state.value === "saving" ? "saving" : "idle");
      stateTimer = setTimeout(() => setState("saving"), SETTLE_MS);
    } else if (pending) {
      setState(state.value);
      stateTimer = setTimeout(() => {
        pending = false;
        setState("saved");
        stateTimer = setTimeout(() => setState("idle"), SAVED_IDLE_MS);
      }, SETTLE_MS);
    }
  }

  // The browser's view, not the socket's: that only notices after ~30s.
  function updateOffline() {
    offline.value = everSynced && !navigator.onLine;
  }

  function settleSync() {
    const done = syncWaiters.filter(
      (w) => w.name !== boundName || synced.value
    );
    syncWaiters = syncWaiters.filter((w) => !done.includes(w));
    done.forEach((w) => w.resolve());
  }

  function bind(h: CollabHandle) {
    const p = h.provider;
    synced.value = p.synced;
    everSynced = p.synced;
    status.value = p.configuration.websocketProvider.status;
    unsyncedChanges.value = p.unsyncedChanges;

    const onSynced = () => {
      synced.value = true;
      everSynced = true;
      updateState();
      updateOffline();
      settleSync();
    };
    const onStatus = ({ status: s }: { status: WebSocketStatus }) => {
      status.value = s;
      if (s !== WebSocketStatus.Connected) synced.value = false;
      updateState();
    };
    const onUnsynced = ({ number }: { number: number }) => {
      unsyncedChanges.value = number;
      updateState();
    };
    const onStateless = ({ payload }: { payload: string }) => {
      let msg: { type?: string } & Partial<CollabStored>;
      try {
        msg = JSON.parse(payload);
      } catch {
        return;
      }
      if (msg.type === "stored") {
        tooLarge.value = false;
        updateState();
        opts.onStored?.({ title: msg.title ?? "", updated_at: msg.updated_at ?? "" });
      } else if (msg.type === "too_large") {
        tooLarge.value = true;
        updateState();
        opts.onTooLarge?.();
      }
    };

    p.on("synced", onSynced);
    p.on("status", onStatus);
    p.on("unsyncedChanges", onUnsynced);
    p.on("stateless", onStateless);
    unbind = () => {
      p.off("synced", onSynced);
      p.off("status", onStatus);
      p.off("unsyncedChanges", onUnsynced);
      p.off("stateless", onStateless);
    };
  }

  function release() {
    unbind?.();
    unbind = null;
    handle.value?.release();
    handle.value = null;
    synced.value = false;
    unsyncedChanges.value = 0;
    tooLarge.value = false;
    everSynced = false;
    pending = false;
    setState("idle");
    updateOffline();
  }

  watch(
    name,
    (next) => {
      release();
      boundName = next;
      if (next) {
        const h = opts.manager.acquire(next);
        handle.value = h;
        bind(h);
      }
      settleSync();
    },
    // Post: release the old Y.Doc only after the editor using it has unmounted.
    { immediate: true, flush: "post" }
  );

  // With local persistence, unsent edits survive the tab and the sync worker sends them.
  function beforeUnload(e: BeforeUnloadEvent) {
    if (unsyncedChanges.value > 0 && !handle.value?.isLocal()) e.preventDefault();
  }
  window.addEventListener("beforeunload", beforeUnload);
  window.addEventListener("online", updateOffline);
  window.addEventListener("offline", updateOffline);

  onBeforeUnmount(() => {
    window.removeEventListener("beforeunload", beforeUnload);
    window.removeEventListener("online", updateOffline);
    window.removeEventListener("offline", updateOffline);
    release();
    boundName = null;
    settleSync();
  });

  return {
    handle,
    synced,
    status,
    unsyncedChanges,
    state,
    offline,
    whenSynced() {
      const n = name.value;
      if (!n || (n === boundName && synced.value)) return Promise.resolve();
      return new Promise((resolve) => syncWaiters.push({ name: n, resolve }));
    },
  };
}
