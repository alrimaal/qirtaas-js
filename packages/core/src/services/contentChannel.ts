// The content channel: quran / hadith / mushaf reads, authorized by a content
// API key — never a user token or document signature. Shared by the editor and
// renderer (content access is identical regardless of how the document itself is
// authorized). The key is optional today (these endpoints aren't gated yet);
// when gating lands, this is the single place it attaches.
import { createFetchChannel } from "./fetchChannel";
import type { Channel } from "./transport";

const CONTENT_KEY_HEADER = "X-Qirtaas-Content-Key";

export interface ContentChannelOptions {
  apiUrl: string;
  apiKey?: string;
}

export function createContentChannel(opts: ContentChannelOptions): Channel {
  // No 401 recovery: a missing/invalid content key isn't something we can refresh.
  return createFetchChannel(opts.apiUrl, () =>
    opts.apiKey ? { headers: { [CONTENT_KEY_HEADER]: opts.apiKey } } : {}
  );
}
