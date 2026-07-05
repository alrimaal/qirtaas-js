// Read-only React adapter for @qirtaas/core's renderer. Exactly one auth source
// (getSignature | getToken | shareToken) must be supplied; core enforces it.
import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { createQirtaasClient } from "@qirtaas/core";
import type {
  RendererInstance,
  RendererMountOptions,
  Locale,
  Theme,
  ErrorCode,
} from "@qirtaas/core";

export interface QirtaasRendererProps {
  apiUrl?: string;
  documentId?: string;
  locale?: Locale;
  theme?: Theme;
  getSignature?: RendererMountOptions["getSignature"];
  getToken?: RendererMountOptions["getToken"];
  shareToken?: string;
  onReady?: () => void;
  onError?: (code: ErrorCode, detail?: unknown) => void;
}

export interface QirtaasRendererHandle {
  setTheme: (theme: Theme) => void;
}

export const QirtaasRenderer = forwardRef<
  QirtaasRendererHandle,
  QirtaasRendererProps
>(function QirtaasRenderer(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<RendererInstance | null>(null);
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    if (!host.current) return;
    const p = latest.current;
    // Renderer auth is per-call; the client only carries apiUrl.
    const client = createQirtaasClient({ apiUrl: p.apiUrl });
    const inst = client.mountRenderer(host.current, {
      documentId: p.documentId,
      locale: p.locale,
      theme: p.theme,
      getSignature: p.getSignature,
      getToken: p.getToken,
      shareToken: p.shareToken,
      onReady: () => latest.current.onReady?.(),
      onError: (code, detail) => latest.current.onError?.(code, detail),
    });
    instance.current = inst;
    return () => {
      inst.destroy();
      instance.current = null;
    };
  }, []);

  useEffect(() => {
    if (props.theme) instance.current?.setTheme(props.theme);
  }, [props.theme]);

  useImperativeHandle(
    ref,
    () => ({ setTheme: (theme: Theme) => instance.current?.setTheme(theme) }),
    []
  );

  return createElement("div", { ref: host });
});
