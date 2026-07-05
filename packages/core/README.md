# @qirtaas/core

Framework-agnostic, embeddable rich-text editor SDK for Islamic scholarly
writing (Qur'an verses, hadith, RTL/Arabic typography). Ships a single bundle
with a self-contained mount API and its own scoped styles, so it drops into any
host page without leaking CSS or fighting the host's framework.

For React or Vue hosts, prefer the idiomatic wrappers
[`@qirtaas/react`](https://www.npmjs.com/package/@qirtaas/react) and
[`@qirtaas/vue`](https://www.npmjs.com/package/@qirtaas/vue).

## Install

```sh
npm install @qirtaas/core
```

## Usage (ESM)

```js
import { createQirtaasClient } from "@qirtaas/core";
import "@qirtaas/core/qirtaas.css";

const qirtaas = createQirtaasClient({
  apiUrl: "https://api.example.com",
  getToken: () => fetchEmbedJwt(), // called on init, before expiry, and on 401
});

const editor = qirtaas.mountEditor("#editor", {
  documentId: "<uuid>",
  locale: "en",
  theme: "light",
  onReady: () => console.log("ready"),
  onChange: (json) => console.log(json),
});

// Read-only renderer (public read via a share token):
qirtaas.mountRenderer("#renderer", {
  shareToken: "<token>",
  theme: "light",
});
```

## Usage (script tag / UMD)

```html
<link rel="stylesheet" href="https://unpkg.com/@qirtaas/core/dist/qirtaas.css" />
<script src="https://unpkg.com/@qirtaas/core/dist/qirtaas.umd.js"></script>
<script>
  const qirtaas = Qirtaas.createQirtaasClient({ apiUrl, getToken });
  qirtaas.mountEditor("#editor", { documentId });
</script>
```

The host must give the editor mount element a bounded height; the renderer grows
with its content.

## Documentation

Full docs at [docs.qirtaas.io](https://docs.qirtaas.io). For AI coding
assistants: the complete docs as one markdown file at
[docs.qirtaas.io/llms-full.txt](https://docs.qirtaas.io/llms-full.txt), and
ready-made integration prompts at
[docs.qirtaas.io/ai/build-with-ai](https://docs.qirtaas.io/ai/build-with-ai).

## License

MIT
