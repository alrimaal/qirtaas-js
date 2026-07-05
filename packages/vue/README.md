# @qirtaas/vue

Idiomatic Vue 3 components wrapping the [`@qirtaas/core`](https://www.npmjs.com/package/@qirtaas/core)
embeddable rich-text editor. The editor is bundled from source but shares the
host's single Vue and PrimeVue instances (declared as peer dependencies), so
there's no double-bundled reactivity or duelling theme singleton.

## Install

```sh
npm install @qirtaas/vue
```

Peer dependencies: `vue@^3.4`, `primevue@^4`, `@primeuix/themes@^1`.

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { QirtaasEditor } from "@qirtaas/vue";
import "@qirtaas/vue/qirtaas.css";

const editor = ref();
const getToken = () => fetchEmbedJwt(); // required: called on init, before expiry, on 401
</script>

<template>
  <QirtaasEditor
    ref="editor"
    api-url="https://api.example.com"
    :get-token="getToken"
    document-id="<uuid>"
    locale="en"
    theme="light"
    @ready="() => console.log('ready')"
    @change="(json) => console.log(json)"
  />
</template>
```

A read-only `QirtaasRenderer` is also exported, along with `createQirtaasClient`
for imperative, mount-less operations (e.g. `deleteDocument` from a list view).

## Documentation

Full docs at [docs.qirtaas.io](https://docs.qirtaas.io). For AI coding
assistants: the complete docs as one markdown file at
[docs.qirtaas.io/llms-full.txt](https://docs.qirtaas.io/llms-full.txt), and
ready-made integration prompts at
[docs.qirtaas.io/ai/build-with-ai](https://docs.qirtaas.io/ai/build-with-ai).

## License

MIT
