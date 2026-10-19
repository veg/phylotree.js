#!/usr/bin/env bash
# Assemble the GitHub Pages site (demo app, API docs, built library) into the
# directory given as $1. Expects `yarn build` and `yarn docs:generate` to have
# run already. Used by docs-site.yml (master, site root) and pr-preview-build.yml
# (one copy per pull request under pr-preview/pr-<number>/).
#
# Every path in the site is relative, so the same output works at the site root
# and in a sub-directory. The repo's CNAME is deliberately not copied: the
# custom domain is served elsewhere and must not be claimed by Pages.
set -euo pipefail

out="${1:?usage: scripts/build-site.sh <output-dir>}"

rm -rf "$out"
mkdir -p "$out"

# The demo page loads dist/phylotree.js and phylotree.css relative to itself,
# so both must sit next to it.
cp index.html phylotree.css README.md API.md "$out"/
cp -r dist "$out"/

# Serve files as-is (no Jekyll), so index.html is the demo app.
touch "$out"/.nojekyll

