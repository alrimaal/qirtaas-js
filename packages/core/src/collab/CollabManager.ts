import {
  HocuspocusProvider,
  HocuspocusProviderWebsocket,
  WebSocketStatus,
} from "@hocuspocus/provider";
import * as Y from "yjs";
import { IndexeddbPersistence, clearDocument } from "y-indexeddb";

export interface CollabApi {
  token: () => string | Promise<string>;
  /** Scopes local DBs per user. Rejecting opens docs without local persistence. */
  userId(): Promise<string>;
  /** Stored snapshot; null if the doc is gone or no longer accessible. */
  snapshot(name: string): Promise<Uint8Array | null>;
}

export interface CollabHandle {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  /** Edits also go to IndexedDB. */
  isLocal(): boolean;
  /** Resolves once the server has stored the doc as it is now. */
  whenStored(): Promise<void>;
  /** Resolves once the doc is closed (if this was the last holder). */
  release(): Promise<void>;
}

interface Entry {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  refs: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
  retryDelay: number;
  persistence: IndexeddbPersistence | null;
  unlock: (() => void) | null;
  opened: Promise<void>;
  closed: Promise<void> | null;
}

const RETRY_MIN_MS = 1000;
const RETRY_MAX_MS = 30000;
const SYNC_RETRY_MIN_MS = 5000;
const SYNC_RETRY_MAX_MS = 5 * 60 * 1000;
const STORE_TIMEOUT_MS = 30000;
const STORED_POLL_MS = 1000;

const localDbName = (userId: string, docName: string) =>
  `qirtaas:${userId}:${docName}`;
const idbLock = (dbName: string) => `qirtaas-idb:${dbName}`;

/** A local DB's full state, read into a throwaway doc. */
async function readLocalState(dbName: string): Promise<Uint8Array> {
  const doc = new Y.Doc();
  const persistence = new IndexeddbPersistence(dbName, doc);
  await persistence.whenSynced;
  await persistence.destroy();
  const state = Y.encodeStateAsUpdate(doc);
  doc.destroy();
  return state;
}

/** Holds a Web Lock until the returned function is called; null if not available. */
function lock(
  name: string,
  mode: LockMode,
  ifAvailable = false
): Promise<(() => void) | null> {
  return new Promise((resolve, reject) => {
    navigator.locks
      .request(name, { mode, ifAvailable }, (held) => {
        if (!held) return resolve(null);
        return new Promise<void>((release) => resolve(release));
      })
      .catch(reject);
  });
}

/** Resolves on the server's next "stored" broadcast for this doc. */
function nextStore(provider: HocuspocusProvider): Promise<void> {
  return new Promise((resolve, reject) => {
    const onStateless = ({ payload }: { payload: string }) => {
      if (JSON.parse(payload).type !== "stored") return;
      clearTimeout(timer);
      provider.off("stateless", onStateless);
      resolve();
    };
    const timer = setTimeout(() => {
      provider.off("stateless", onStateless);
      reject(new Error("no store"));
    }, STORE_TIMEOUT_MS);
    provider.on("stateless", onStateless);
  });
}

/**
 * One per tab. Shares a single socket across every open doc, refcounts one
 * Y.Doc + provider (+ local persistence) per doc name, and runs the sync worker.
 */
export class CollabManager {
  private socket: HocuspocusProviderWebsocket | null = null;
  private entries = new Map<string, Entry>();
  private userId: Promise<string> | null = null;
  private syncStarted = false;
  private syncing = false;
  private syncRetryDelay = SYNC_RETRY_MIN_MS;

  constructor(private readonly url: string, private readonly api: CollabApi) {}

  acquire(name: string): CollabHandle {
    let entry = this.entries.get(name);
    if (!entry) {
      entry = this.create(name);
      this.entries.set(name, entry);
    }
    entry.refs++;
    const e = entry;
    let released = false;
    return {
      ydoc: e.ydoc,
      provider: e.provider,
      isLocal: () => e.persistence !== null,
      whenStored: () => this.whenStored(name, e),
      release: () => {
        if (!released) {
          released = true;
          if (--e.refs === 0) this.destroy(name, e);
        }
        return e.closed ?? Promise.resolve();
      },
    };
  }

  private async whenStored(name: string, entry: Entry) {
    const state = Y.encodeStateAsUpdate(entry.ydoc);
    for (let i = 0; i < STORE_TIMEOUT_MS / STORED_POLL_MS; i++) {
      const snapshot = await this.api.snapshot(name);
      if (!snapshot || Y.snapshotContainsUpdate(Y.decodeSnapshot(snapshot), state)) {
        return;
      }
      await new Promise((r) => setTimeout(r, STORED_POLL_MS));
    }
    throw new Error("not stored");
  }

  /** Starts the sync worker: runs now and on reconnect. */
  startSync() {
    if (this.syncStarted) return;
    this.syncStarted = true;
    this.nudge();
  }

  private loadUserId() {
    this.userId ??= this.api.userId().catch((e) => {
      this.userId = null;
      throw e;
    });
    return this.userId;
  }

  private getSocket(): HocuspocusProviderWebsocket {
    if (!this.socket) {
      this.socket = new HocuspocusProviderWebsocket({ url: this.url });
      this.socket.on("connect", () => this.nudge());
      // Skip the reconnect backoff; no-op if already connected.
      window.addEventListener("online", () => void this.socket?.connect());
    }
    return this.socket;
  }

  private create(name: string): Entry {
    const socket = this.getSocket();
    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      name,
      document: ydoc,
      websocketProvider: socket,
      token: async () => this.api.token(),
    });
    const entry: Entry = {
      ydoc,
      provider,
      refs: 0,
      retryTimer: null,
      retryDelay: RETRY_MIN_MS,
      persistence: null,
      unlock: null,
      opened: Promise.resolve(),
      closed: null,
    };

    // Auth and load failures (e.g. doc not collab yet) both arrive as
    // permission denied, and the provider never retries on its own.
    provider.on("authenticationFailed", () => {
      if (entry.retryTimer) return;
      const delay = entry.retryDelay;
      entry.retryDelay = Math.min(delay * 2, RETRY_MAX_MS);
      entry.retryTimer = setTimeout(() => {
        entry.retryTimer = null;
        // A reconnect re-authenticates by itself.
        if (socket.status !== WebSocketStatus.Connected) return;
        void provider.sendToken().then(() => provider.startSync());
      }, delay);
    });
    provider.on("synced", () => {
      entry.retryDelay = RETRY_MIN_MS;
    });
    provider.on("disconnect", () => clearRetry(entry));

    entry.opened = this.open(name, entry);
    return entry;
  }

  /** Loads the local copy, then attaches the provider. */
  private async open(name: string, entry: Entry) {
    try {
      const dbName = localDbName(await this.loadUserId(), name);
      entry.unlock = await lock(idbLock(dbName), "shared");
      if (entry.closed) return;
      entry.persistence = new IndexeddbPersistence(dbName, entry.ydoc);
      await entry.persistence.whenSynced;
    } catch (e) {
      console.error(`[collab] local persistence unavailable for ${name}`, e);
      await entry.persistence?.destroy().catch(() => {});
      entry.persistence = null;
    }
    if (!entry.closed) entry.provider.attach();
  }

  private destroy(name: string, entry: Entry) {
    clearRetry(entry);
    this.entries.delete(name);
    entry.provider.destroy();
    entry.closed = entry.opened.then(async () => {
      await entry.persistence?.destroy();
      entry.unlock?.();
      entry.ydoc.destroy();
    });
  }

  /** Runs the sync worker unless it's already running. */
  private nudge() {
    if (this.syncStarted && !this.syncing) void this.sync();
  }

  private async sync() {
    this.syncing = true;
    let ok = false;
    try {
      ok = await this.syncPass();
    } catch (e) {
      console.error("[collab] sync worker failed", e);
    }
    this.syncing = false;
    if (ok) {
      this.syncRetryDelay = SYNC_RETRY_MIN_MS;
    } else {
      setTimeout(() => this.nudge(), this.syncRetryDelay);
      this.syncRetryDelay = Math.min(
        this.syncRetryDelay * 2,
        SYNC_RETRY_MAX_MS
      );
    }
  }

  /** Syncs every closed doc with a local copy. False if any copy was kept. */
  private async syncPass(): Promise<boolean> {
    const prefix = localDbName(await this.loadUserId(), "");
    const dbNames = (await indexedDB.databases())
      .map((db) => db.name)
      .filter((n): n is string => !!n?.startsWith(prefix));
    let ok = true;
    for (const dbName of dbNames) {
      const name = dbName.slice(prefix.length);
      try {
        await this.syncDoc(name, dbName);
      } catch (e) {
        console.warn(`[collab] keeping local copy of ${name}`, e);
        ok = false;
      }
    }
    return ok;
  }

  /** Deletes the local copy once the server has stored it. Throws if kept. */
  private async syncDoc(name: string, dbName: string) {
    if (await this.deleteIfStored(name, dbName)) return;

    // Opening sends the server what it lacks, which triggers a store.
    const handle = this.acquire(name);
    try {
      await nextStore(handle.provider);
    } finally {
      await handle.release();
    }
    if (!(await this.deleteIfStored(name, dbName))) {
      throw new Error("local edits not stored yet");
    }
  }

  /**
   * Deletes the local copy if the stored snapshot contains it, or if the doc
   * is gone. Reread under an exclusive lock, so what's checked is what's deleted.
   */
  private async deleteIfStored(name: string, dbName: string): Promise<boolean> {
    const unlock = await lock(idbLock(dbName), "exclusive", true);
    // Open somewhere: left for a later pass.
    if (!unlock) return true;
    try {
      const snapshot = await this.api.snapshot(name);
      if (snapshot) {
        const state = await readLocalState(dbName);
        if (!Y.snapshotContainsUpdate(Y.decodeSnapshot(snapshot), state)) {
          return false;
        }
      }
      await clearDocument(dbName);
      return true;
    } finally {
      unlock();
    }
  }
}

function clearRetry(entry: Entry) {
  if (entry.retryTimer) clearTimeout(entry.retryTimer);
  entry.retryTimer = null;
}
