# Contributing

## Requirements

- Node.js 22.12 or newer (jsdom, used by the tests, needs 22.22 or newer).
- Yarn 1 (classic). If your global `yarn` is a newer major version, run the
  commands below as `npx yarn@1 <command>`.

There is no committed lockfile. Like the people who install phylotree from
npm, CI and contributors get the newest versions `package.json` allows, so
problems with a new dependency release show up here first.

## Development workflow

```
git clone https://github.com/veg/phylotree.js phylotree.js
cd phylotree.js
yarn install
yarn serve
```

`yarn serve` rebuilds the bundle with rollup whenever a file in `src/`
changes and serves the repository at `http://localhost:8080/`. Refresh the
browser after a rebuild to see your changes.

The library source lives in `src/` (entry point `src/index.js`). Rollup
writes the bundles to `dist/`, which is generated and not committed; do not
edit it by hand.

## Scripts

| Command              | What it does                                                     |
| -------------------- | ---------------------------------------------------------------- |
| `yarn build`         | Build `dist/phylotree.js`, `dist/phylotree.min.js` and the CSS.  |
| `yarn dev`           | Rebuild `dist/` on every change (no web server).                 |
| `yarn test`          | Run the tape tests in `test/`. Run `yarn build` first: the tests load `dist/phylotree.js`. |
| `yarn lint`          | Run ESLint over the repository.                                  |
| `yarn typecheck`     | Type-check `types/phylotree.d.ts` against `test/types/usage.ts` (run in CI). |
| `yarn docs:generate` | Regenerate `API.md` from the JSDoc comments in `src/`.           |
| `yarn docs:validate` | Local check: fail if `API.md` is out of date with the JSDoc comments (not run in CI). |
| `yarn docs:watch`    | Regenerate `API.md` whenever a file in `src/` changes.           |

Before opening a pull request, run:

```
yarn build
yarn test
yarn lint
yarn typecheck
```

CI runs the build and tests on both Linux and Windows, so keep package
scripts portable (quote globs with double quotes, avoid POSIX-only tools).

`API.md` is regenerated and committed automatically after changes reach
`master`, so CI does not require it to be current in pull requests. If you
change JSDoc comments you can still run `yarn docs:generate` and commit the
result yourself, and `yarn docs:validate` tells you whether that is needed.

## Previews

Every pull request gets a live preview of the demo app and API docs at
`https://veg.github.io/phylotree.js/pr-preview/pr-<number>/`. A bot comment on
the pull request links to it and is updated on every push; the preview is
removed when the pull request is closed. The latest `master` is at
<https://veg.github.io/phylotree.js/>.
