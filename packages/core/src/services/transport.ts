// HTTP transport seam for the editor's data services. Carries no app/framework
// deps so the services can live in @qirtaas/core; the host configures the
// concrete transport once at startup (SPA: axios under /api; embed SDK: fetch
// under /v1).
//
// Two credential CHANNELS, picked by what a service is — never by sniffing the
// path:
//   - data:    documents + images   → bearer | signature | share (mode-dependent)
//   - content: quran / hadith / mushaf → content API key
// A per-document signature lives only in the renderer's data channel, so it can
// never structurally reach a content endpoint — the content channel has no
// signature code at all.
//
// Paths passed to a channel are VERSION-RELATIVE (e.g. "/quran/search/"); each
// channel owns its versioned prefix in `apiUrl` (the full base, e.g.
// ".../v1"), also used to build static asset URLs (mushaf SVG/clip).
export interface Channel {
  /** Full versioned base URL, e.g. ".../v1" — also for static asset URLs. */
  apiUrl: string;
  get<T = unknown>(
    path: string,
    opts?: { params?: Record<string, unknown> }
  ): Promise<T>;
  post<T = unknown>(path: string, body?: unknown): Promise<T>;
  patch<T = unknown>(path: string, body?: unknown): Promise<T>;
  delete<T = unknown>(path: string): Promise<T>;
}

export interface QirtaasTransport {
  /** documents + images, authorized by the active mode (bearer/signature/share). */
  data: Channel;
  /** quran / hadith / mushaf, authorized by the content API key. */
  content: Channel;
}

let current: QirtaasTransport | null = null;

export function setTransport(transport: QirtaasTransport): void {
  current = transport;
}

export function getTransport(): QirtaasTransport {
  if (!current) {
    throw new Error(
      "Qirtaas transport not configured — call setTransport() before using data services."
    );
  }
  return current;
}
