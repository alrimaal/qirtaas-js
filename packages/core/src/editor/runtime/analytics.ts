// Module-singleton analytics sink. The host configures it once at startup via
// setTrackEvent (SPA: PostHog; embed SDK later: options.onEvent). Module-level
// rather than Vue `inject` so non-component callers — e.g. the singleton
// verse/hadith-detail composables — can emit events too. Default: no-op.
export type TrackEventFn = (
  event: string,
  properties?: Record<string, unknown>
) => void;

let current: TrackEventFn = () => {};

export function setTrackEvent(fn: TrackEventFn): void {
  current = fn;
}

export function trackEvent(
  event: string,
  properties?: Record<string, unknown>
): void {
  current(event, properties);
}
