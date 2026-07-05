// Editor transport. The data channel is authed by the host's getToken (bearer,
// with proactive refresh + one-shot 401 recovery via the token manager); the
// content channel by the content API key. Service paths are version-relative
// ("/documents/…", "/quran/…"), so the version lives only here, in the channel
// base URLs.
import type { QirtaasTransport } from "./transport";
import { createFetchChannel } from "./fetchChannel";
import { createContentChannel } from "./contentChannel";
import { createTokenManager } from "./tokenManager";

export interface EmbedTransportOptions {
  apiUrl: string;
  getToken: () => Promise<string> | string;
  /** Forwarded to the token manager; fired when a forced refresh fails. */
  onTokenExpired?: () => void;
  /** Content API base (defaults to apiUrl) + key for quran/hadith/mushaf. */
  contentApiUrl?: string;
  contentApiKey?: string;
}

export function createEmbedTransport(
  opts: EmbedTransportOptions
): QirtaasTransport {
  const v1 = `${opts.apiUrl.replace(/\/+$/, "")}/v1`;
  const tokens = createTokenManager({
    getToken: opts.getToken,
    onTokenExpired: opts.onTokenExpired,
  });

  const data = createFetchChannel(
    v1,
    async () => {
      const token = await tokens.getValidToken();
      return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    },
    () => tokens.invalidate()
  );

  const content = createContentChannel({
    apiUrl: opts.contentApiUrl
      ? `${opts.contentApiUrl.replace(/\/+$/, "")}/v1`
      : v1,
    apiKey: opts.contentApiKey,
  });

  return { data, content };
}
