// Owns the lifecycle of the host-supplied embed token: caches it, refreshes
// proactively before it expires (so a long editing session never blocks a
// request on a 401 round-trip), and surfaces a fatal refresh failure once via
// onTokenExpired so the host can re-auth and autosave can pause.
//
// The host's getToken is the source of truth — it is expected to return a fresh
// token whenever called (mint or read from the customer backend). We cache the
// value only to avoid calling it on every single request, and decode the JWT
// `exp` purely to know when to call it again.

export interface TokenManagerOptions {
  getToken: () => Promise<string> | string;
  /** Fired once when a forced refresh fails (host should prompt re-auth). */
  onTokenExpired?: () => void;
}

// Refresh this long before the decoded exp, so a request never rides a token
// that's about to lapse mid-flight (clock skew + network latency margin).
const REFRESH_SKEW_MS = 60_000;

/** Decode a JWT's `exp` (unix seconds) without verifying it. Null if absent/unparseable. */
function decodeExpiry(token: string): number | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export interface TokenManager {
  /** A token guaranteed fresh past REFRESH_SKEW_MS, refreshing if needed. */
  getValidToken(): Promise<string>;
  /** Drop the cache so the next getValidToken() re-fetches (used after a 401). */
  invalidate(): void;
}

export function createTokenManager(opts: TokenManagerOptions): TokenManager {
  let cached: string | null = null;
  let expiresAt: number | null = null;
  // De-dupe concurrent refreshes (autosave + image fetch can race on init).
  let inFlight: Promise<string> | null = null;

  function fresh(): boolean {
    if (!cached) return false;
    // No decodable exp → treat as opaque and re-fetch each time the cache is
    // cleared; we still cache within a single request burst via inFlight.
    if (expiresAt == null) return false;
    return Date.now() < expiresAt - REFRESH_SKEW_MS;
  }

  async function refresh(): Promise<string> {
    try {
      const token = await opts.getToken();
      cached = token;
      expiresAt = decodeExpiry(token);
      return token;
    } catch (err) {
      cached = null;
      expiresAt = null;
      opts.onTokenExpired?.();
      throw err;
    } finally {
      inFlight = null;
    }
  }

  return {
    getValidToken() {
      if (fresh() && cached) return Promise.resolve(cached);
      if (!inFlight) inFlight = refresh();
      return inFlight;
    },
    invalidate() {
      cached = null;
      expiresAt = null;
    },
  };
}
