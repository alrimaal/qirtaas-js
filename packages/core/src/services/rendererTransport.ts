// Renderer transport (read paths). The DATA channel is the only place a
// signature ever lives — built once at mount, it applies exactly one of:
//   getToken     → Authorization: Bearer (token-managed, 401-recoverable)
//   getSignature → ?sig=&exp= (self-contained signed URL; not 401-recoverable)
//   neither      → no auth (public share token; doc fetched via /shared/<token>/)
// The CONTENT channel is content-key only, so a per-doc signature can't reach a
// content endpoint by construction. The signature rides query params (not a
// header) so cross-origin GETs stay CORS "simple requests" and the URL is
// directly usable / CDN-edge verifiable.
import type { QirtaasTransport } from "./transport";
import { createFetchChannel, type ChannelAuth } from "./fetchChannel";
import { createContentChannel } from "./contentChannel";
import { createTokenManager } from "./tokenManager";

export interface RendererTransportOptions {
  apiUrl: string;
  getToken?: () => Promise<string> | string;
  getSignature?: () => Promise<{ signature: string; exp: number }>;
  contentApiUrl?: string;
  contentApiKey?: string;
}

// Re-sign this long before exp so a request never rides an about-to-lapse sig.
const SIGNATURE_SKEW_S = 60;

function createSignatureProvider(
  getSignature: () => Promise<{ signature: string; exp: number }>
): () => Promise<{ signature: string; exp: number }> {
  let cached: { signature: string; exp: number } | null = null;
  let inFlight: Promise<{ signature: string; exp: number }> | null = null;
  return () => {
    const now = Math.floor(Date.now() / 1000);
    if (cached && cached.exp - SIGNATURE_SKEW_S > now) {
      return Promise.resolve(cached);
    }
    if (!inFlight) {
      inFlight = Promise.resolve(getSignature())
        .then((sig) => {
          cached = sig;
          return sig;
        })
        .finally(() => {
          inFlight = null;
        });
    }
    return inFlight;
  };
}

export function createRendererTransport(
  opts: RendererTransportOptions
): QirtaasTransport {
  const v1 = `${opts.apiUrl.replace(/\/+$/, "")}/v1`;

  const tokens = opts.getToken
    ? createTokenManager({ getToken: opts.getToken })
    : null;
  const signature = opts.getSignature
    ? createSignatureProvider(opts.getSignature)
    : null;

  const dataAuth = async (): Promise<ChannelAuth> => {
    if (tokens) {
      const token = await tokens.getValidToken();
      return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    }
    if (signature) {
      const sig = await signature();
      return { params: { exp: sig.exp, sig: sig.signature } };
    }
    return {};
  };

  // Only token reads can recover from a 401; a bad signature 403s and re-fetching
  // won't help (the skew window already guards expiry).
  const data = createFetchChannel(
    v1,
    dataAuth,
    tokens ? () => tokens.invalidate() : undefined
  );

  const content = createContentChannel({
    apiUrl: opts.contentApiUrl
      ? `${opts.contentApiUrl.replace(/\/+$/, "")}/v1`
      : v1,
    apiKey: opts.contentApiKey,
  });

  return { data, content };
}
