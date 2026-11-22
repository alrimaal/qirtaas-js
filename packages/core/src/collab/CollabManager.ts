import {
  HocuspocusProvider,
  HocuspocusProviderWebsocket,
  WebSocketStatus,
} from "@hocuspocus/provider";
import * as Y from "yjs";

export type CollabToken = () => string | Promise<string>;

export interface CollabHandle {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  release(): void;
}

interface Entry {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  refs: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
  retryDelay: number;
}

const RETRY_MIN_MS = 1000;
const RETRY_MAX_MS = 30000;

/**
 * One per tab. Shares a single socket across every open doc and refcounts
 * one Y.Doc + provider per doc name.
 */
export class CollabManager {
  private socket: HocuspocusProviderWebsocket | null = null;
  private entries = new Map<string, Entry>();

  constructor(private readonly url: string) {}

  acquire(name: string, opts: { token: CollabToken }): CollabHandle {
    let entry = this.entries.get(name);
    if (!entry) {
      entry = this.create(name, opts.token);
      this.entries.set(name, entry);
    }
    entry.refs++;
    const e = entry;
    let released = false;
    return {
      ydoc: e.ydoc,
      provider: e.provider,
      release: () => {
        if (released) return;
        released = true;
        if (--e.refs === 0) this.destroy(name, e);
      },
    };
  }

  private getSocket(): HocuspocusProviderWebsocket {
    this.socket ??= new HocuspocusProviderWebsocket({ url: this.url });
    return this.socket;
  }

  private create(name: string, token: CollabToken): Entry {
    const socket = this.getSocket();
    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      name,
      document: ydoc,
      websocketProvider: socket,
      token: async () => token(),
    });
    const entry: Entry = {
      ydoc,
      provider,
      refs: 0,
      retryTimer: null,
      retryDelay: RETRY_MIN_MS,
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

    provider.attach();
    return entry;
  }

  private destroy(name: string, entry: Entry) {
    clearRetry(entry);
    this.entries.delete(name);
    entry.provider.destroy();
    entry.ydoc.destroy();
  }
}

function clearRetry(entry: Entry) {
  if (entry.retryTimer) clearTimeout(entry.retryTimer);
  entry.retryTimer = null;
}
