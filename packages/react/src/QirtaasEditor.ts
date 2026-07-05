// React adapter over @qirtaas/core's mount() API. React only drives the
// wrapper's lifecycle; the editor itself is a self-contained Vue island that
// core bundles in (a React host needs no Vue). Written with createElement (no
// JSX) so the package builds without a JSX transform.
import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { createQirtaasClient } from "@qirtaas/core";
import type {
  EditorInstance,
  EditorMountOptions,
  QirtaasClientOptions,
  Json,
  Locale,
  Theme,
  SaveState,
  ErrorCode,
} from "@qirtaas/core";

export interface QirtaasEditorProps {
  apiUrl?: string;
  documentId?: string;
  initialContent?: Json | null;
  getToken: NonNullable<QirtaasClientOptions["getToken"]>;
  locale?: Locale;
  theme?: Theme;
  readOnly?: boolean;
  autofocus?: boolean;
  autosave?: EditorMountOptions["autosave"];
  onReady?: () => void;
  onChange?: (json: Json) => void;
  onSaveStateChange?: (state: SaveState) => void;
  onDocumentCreated?: (id: string) => void;
  onError?: (code: ErrorCode, detail?: unknown) => void;
  onTokenExpired?: () => void;
  onEvent?: (name: string, props?: Record<string, unknown>) => void;
}

export interface QirtaasEditorHandle {
  getJSON: () => Json | null;
  save: () => Promise<void>;
  setEditable: (editable: boolean) => void;
  setTheme: (theme: Theme) => void;
}

export const QirtaasEditor = forwardRef<QirtaasEditorHandle, QirtaasEditorProps>(
  function QirtaasEditor(props, ref) {
    const host = useRef<HTMLDivElement>(null);
    const instance = useRef<EditorInstance | null>(null);
    // Latest props for the callbacks, so mount can stay a once-only effect while
    // still calling the current handlers.
    const latest = useRef(props);
    latest.current = props;

    // Mount once. StrictMode double-invokes this (mount → cleanup → mount); the
    // cleanup's destroy() fully tears down, so the second mount is clean.
    useEffect(() => {
      if (!host.current) return;
      const p = latest.current;
      const client = createQirtaasClient({ apiUrl: p.apiUrl, getToken: p.getToken });
      const inst = client.mountEditor(host.current, {
        documentId: p.documentId,
        initialContent: p.initialContent ?? null,
        locale: p.locale,
        theme: p.theme,
        readOnly: p.readOnly,
        autofocus: p.autofocus,
        autosave: p.autosave,
        onReady: () => latest.current.onReady?.(),
        onChange: (json) => latest.current.onChange?.(json),
        onSaveStateChange: (state) => latest.current.onSaveStateChange?.(state),
        onDocumentCreated: (id) => latest.current.onDocumentCreated?.(id),
        onError: (code, detail) => latest.current.onError?.(code, detail),
        onTokenExpired: () => latest.current.onTokenExpired?.(),
        onEvent: (name, eventProps) => latest.current.onEvent?.(name, eventProps),
      });
      instance.current = inst;
      return () => {
        inst.destroy();
        instance.current = null;
      };
    }, []);

    // Live-updatable props → imperative setters.
    useEffect(() => {
      if (props.theme) instance.current?.setTheme(props.theme);
    }, [props.theme]);
    useEffect(() => {
      instance.current?.setEditable(!props.readOnly);
    }, [props.readOnly]);

    useImperativeHandle(
      ref,
      () => ({
        getJSON: () => instance.current?.getJSON() ?? null,
        save: () => instance.current?.save() ?? Promise.resolve(),
        setEditable: (editable: boolean) => instance.current?.setEditable(editable),
        setTheme: (theme: Theme) => instance.current?.setTheme(theme),
      }),
      []
    );

    // The editor owns an internal scroll view (pinned toolbar, scrolling body),
    // so it fills its container; the host must give it a bounded height.
    return createElement("div", { ref: host, style: { height: "100%" } });
  }
);
