# Qirtaas SDK

Embeddable rich-text editor for Islamic scholarly writing — Qur'an verse and
hadith insertion, mushaf pages, and first-class Arabic/RTL typography. Mount it
on any page with a bounded-height element; it ships its own scoped styles and
never fights the host's CSS or framework.

This repository is the public home of the Qirtaas SDK packages. Issues and pull
requests are welcome here.

| Package | Description |
| --- | --- |
| [`@qirtaas/core`](packages/core) | Framework-agnostic mount API + CDN/UMD bundle |
| [`@qirtaas/vue`](packages/vue) | Idiomatic Vue 3 components (shares the host's Vue) |
| [`@qirtaas/react`](packages/react) | Idiomatic React components (no Vue required in the host) |

## Quickstart

```sh
npm install @qirtaas/core   # or @qirtaas/vue / @qirtaas/react
```

```js
import { createQirtaasClient } from "@qirtaas/core";
import "@qirtaas/core/qirtaas.css";

const qirtaas = createQirtaasClient({
  apiUrl: "https://api.qirtaas.io",
  getToken: () => fetchEmbedJwt(), // your backend exchanges its API key for a short-lived token
});

qirtaas.mountEditor("#editor", { documentId, locale: "ar", theme: "light" });
qirtaas.mountRenderer("#renderer", { shareToken }); // read-only, no user token
```

Full documentation — embedding guides, token exchange, and the hosted API —
lives at **[docs.qirtaas.io](https://docs.qirtaas.io)**.

## Self-hosting (bring your own backend)

The SDK talks to any backend implementing the documented `/v1` contract
(documents + images endpoints; additive changes only). Point `apiUrl` at your
implementation; Qur'an/hadith/mushaf content is served by the hosted content
API. See the backend docs at [docs.qirtaas.io](https://docs.qirtaas.io).

## Developing

```sh
npm install
npm run build   # builds core, then the vue and react wrappers
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
