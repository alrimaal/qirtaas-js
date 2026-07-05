# @qirtaas/react

Idiomatic React components wrapping the [`@qirtaas/core`](https://www.npmjs.com/package/@qirtaas/core)
embeddable rich-text editor. Vue is bundled in (a React host supplies none);
only `react` and `react-dom` are peer dependencies.

## Install

```sh
npm install @qirtaas/react
```

Requires React 18+.

## Usage

```tsx
import { useRef } from "react";
import { QirtaasEditor, type QirtaasEditorHandle } from "@qirtaas/react";
import "@qirtaas/react/qirtaas.css";

export default function App() {
  const editorRef = useRef<QirtaasEditorHandle>(null);

  return (
    <QirtaasEditor
      ref={editorRef}
      apiUrl="https://api.example.com"
      getToken={() => fetchEmbedJwt()} // required: called on init, before expiry, on 401
      documentId="<uuid>"
      locale="en"
      theme="light"
      onReady={() => console.log("ready")}
      onChange={(json) => console.log(json)}
      onSaveStateChange={(state) => console.log(state)}
    />
  );
}
```

A read-only `QirtaasRenderer` is also exported, along with `createQirtaasClient`
for imperative, mount-less operations (e.g. `deleteDocument` from a list view).

The editor is a self-contained island — the host needs no Vue. The wrapper is
StrictMode-safe (each cleanup fully destroys the editor).

## Documentation

Full docs at [docs.qirtaas.io](https://docs.qirtaas.io). For AI coding
assistants: the complete docs as one markdown file at
[docs.qirtaas.io/llms-full.txt](https://docs.qirtaas.io/llms-full.txt), and
ready-made integration prompts at
[docs.qirtaas.io/ai/build-with-ai](https://docs.qirtaas.io/ai/build-with-ai).

## License

MIT
