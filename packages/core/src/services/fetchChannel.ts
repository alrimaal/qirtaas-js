// Shared fetch machinery for one credential channel. A channel is a versioned
// base URL plus a per-request `auth` contributor (headers and/or query params);
// the credential logic lives entirely in `auth`, so this file is transport-shaped
// plumbing only — URL building, JSON, and one-shot 401 recovery. Both the data
// and content channels (and editor + renderer flavors of the data channel) are
// built from this, differing only in their `auth` and whether they can recover
// from a 401.
import type { Channel } from "./transport";

export class QirtaasHttpError extends Error {
  constructor(
    public status: number,
    public path: string,
    /** Parsed JSON error body, if any (backend uses { error: "code" }). */
    public body?: unknown
  ) {
    super(`Qirtaas request to ${path} failed (${status})`);
    this.name = "QirtaasHttpError";
  }
}

export interface ChannelAuth {
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
}

export function createFetchChannel(
  apiUrl: string,
  auth: () => Promise<ChannelAuth> | ChannelAuth,
  /** Called on a 401 before a single retry — e.g. drop a stale cached token. */
  onUnauthorized?: () => void
): Channel {
  async function request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    init?: { params?: Record<string, unknown>; body?: unknown },
    retried = false
  ): Promise<T> {
    const a = await auth();
    const url = new URL(apiUrl + path);
    for (const source of [a.params, init?.params]) {
      if (!source) continue;
      for (const [k, v] of Object.entries(source)) {
        if (v != null) url.searchParams.set(k, String(v));
      }
    }
    const res = await fetch(url.toString(), {
      method,
      headers: { "Content-Type": "application/json", ...a.headers },
      body: init?.body != null ? JSON.stringify(init.body) : undefined,
    });

    // One-shot recovery only when the channel knows how (token refresh). A
    // signature/content-key 401 isn't refreshable, so those channels omit it.
    if (res.status === 401 && onUnauthorized && !retried) {
      onUnauthorized();
      return request(method, path, init, true);
    }
    if (!res.ok) {
      throw new QirtaasHttpError(res.status, path, await safeJson(res));
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }

  return {
    apiUrl,
    get: (path, o) => request("GET", path, { params: o?.params }),
    post: (path, body) => request("POST", path, { body }),
    patch: (path, body) => request("PATCH", path, { body }),
    delete: (path) => request("DELETE", path),
  };
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}
