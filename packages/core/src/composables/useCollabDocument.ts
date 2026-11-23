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
  /** Resolves once `name`'s content is loaded, or `name` changes. */
  whenSynced(): Promise<void>;
}

const SAVED_IDLE_MS = 2000;

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
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let unbind: (() => void) | null = null;
  let everSynced = false;
  let boundName: string | null = null;
  let syncWaiters: { name: string; resolve: () => void }[] = [];

  function clearIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
  }

  function updateState() {
    clearIdle();
    // Initial load isn't a save.
    if (!everSynced) state.value = "idle";
    else if (tooLarge.value) state.value = "error";
    else if (unsyncedChanges.value > 0) {
      state.value =
        status.value === WebSocketStatus.Connected ? "saving" : "error";
    } else if (state.value === "saving" || state.value === "error") {
      state.value = "saved";
      idleTimer = setTimeout(() => (state.value = "idle"), SAVED_IDLE_MS);
    }
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
    clearIdle();
    state.value = "idle";
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

  onBeforeUnmount(() => {
    window.removeEventListener("beforeunload", beforeUnload);
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
    whenSynced() {
      const n = name.value;
      if (!n || (n === boundName && synced.value)) return Promise.resolve();
      return new Promise((resolve) => syncWaiters.push({ name: n, resolve }));
    },
  };
}
