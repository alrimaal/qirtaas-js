[![Support Qirtaas](https://img.buymeacoffee.com/button-api/?text=Support%20Qirtaas&emoji=&slug=qirtaas&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff)](https://www.buymeacoffee.com/qirtaas)

# Qirtaas SDK

<p align="center">
<video src="https://github.com/alrimaal/qirtaas-js/raw/main/media/english_preview.mp4"
       poster="https://github.com/alrimaal/qirtaas-js/raw/main/media/en_poster.jpg"
       controls width="800"></video>
</p>

Embeddable rich-text editor for Islamic writing. Supports Quran verse and
hadith insertion, mushaf pages, 150+ translations and tafsirs, and Arabic/RTL typography.

The same SDK is used for [Qirtaas.io](https://qirtaas.io) and [Bunyaan.space](https://bunyaan.space).

## Overview

Qirtaas SDK is the SDK powering [Qirtaas.io](https://qirtaas.io). The SDK maintains enough flexibility to be used in different types of applications:

- `QirtaasRenderer` for readonly embeds e.x: static articles and publications
- Server-side token minting for gatekeeping documents behind authorisation
- HMAC signautres for fine-grained ACLs for multi-user applications.

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

Full documentation at **[docs.qirtaas.io](https://docs.qirtaas.io)**.

## Embed readonly documents

If you have a document (created via the SDK or [Qirtaas.io](https://qirtaas.io)) with public shareable URL, you can embed it using `QirtaasRenderer`. React example:

```js
import { QirtaasRenderer } from "@qirtaas/react";

const shareToken = "iM2F1gU"; // Document url: qirtaas.io/iM2F1gU
export function SharedNote({ shareToken }: { shareToken: string }) {
  // No documentId needed — the token resolves the document.
  return <QirtaasRenderer shareToken={shareToken} locale="ar" theme="light" />;
}
```

## Self-hosting (bring your own backend)

The SDK talks to any backend implementing the documented `/v1` contract
(documents + images endpoints; additive changes only). Point `apiUrl` at your
implementation; Qur'an/hadith/mushaf content is served by the hosted content
API. See the backend docs at [docs.qirtaas.io](https://docs.qirtaas.io).

## Packages

| Package                            | Description                                              |
| ---------------------------------- | -------------------------------------------------------- |
| [`@qirtaas/core`](packages/core)   | Framework-agnostic mount API + CDN/UMD bundle            |
| [`@qirtaas/vue`](packages/vue)     | Idiomatic Vue 3 components (shares the host's Vue)       |
| [`@qirtaas/react`](packages/react) | Idiomatic React components (no Vue required in the host) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)

⭐ **Star this repo** if you found it useful!
