# Contributing to the Qirtaas SDK

Thanks for helping improve Qirtaas! Issues and pull requests are welcome in
this repository.

## How changes flow

This repository is the public mirror of the `packages/` tree of a private
monorepo (which also contains the Qirtaas web app and backend). Pull requests
are reviewed here with normal GitHub tooling. When a PR is approved, a
maintainer ports it into the monorepo **with your authorship preserved**
(`git am` on the PR patch), and the sync bot replays the commit back out here —
so the merged commit on `main` still shows you as the author. Your PR is then
closed with a link to the synced commit.

Practical consequences:

- PRs are not merged via the GitHub merge button; they land through the
  port-and-sync round trip described above.
- `main` here only ever moves forward via the sync bot.

By opening a pull request you agree that your contribution is licensed under
the repository's [MIT license](LICENSE).

## Development setup

```sh
npm install
npm run build        # core first, then the vue/react wrappers
```

- `packages/core` — the editor itself plus the framework-agnostic mount API.
  Its source imports itself as `@qirtaas/core/...`; the Vite configs alias that
  to `packages/core/src`.
- `packages/vue` and `packages/react` bundle core **from source**, so you don't
  need to rebuild core to test wrapper changes.

## Reporting security issues

Please do not open public issues for vulnerabilities — see
[SECURITY.md](SECURITY.md).
