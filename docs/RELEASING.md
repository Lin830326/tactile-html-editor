# Releasing Tactile

A release is a Git tag `vX.Y.Z` on `main` and a GitHub release whose main asset is `tactile.html`, the single-file editor. Users can always download the newest one from:

```
https://github.com/Lin830326/tactile-html-editor/releases/latest/download/tactile.html
```

The [release workflow](../.github/workflows/release.yml) runs only when a version tag is pushed. It does not run on ordinary pushes or pull requests.

## Versions

Versions follow [Semantic Versioning](https://semver.org). Before 1.0, a minor version (0.**2**.0) may contain breaking changes and a patch version (0.1.**1**) contains fixes only. Something counts as breaking when documents, exports, autosaves or settings from the previous version would no longer open or behave the same.

## Steps

### 1. Check `main` locally

```bash
git switch main
git pull
npm ci
npx playwright install chromium   # once
node build.mjs
git diff --exit-code -- dist/
(cd ingest && npm ci --ignore-scripts && npm test)   # first: the editor's tests run tactile-ingest
npm test
node tools/set-repo.mjs --check
```

`git diff` must print nothing and both test runs must pass. Then check by hand, in Chrome or Edge and in Firefox or Safari, with `dist/tactile.html` opened from disk:

- every built-in template opens; select, edit text, drag, undo and redo work;
- export an edited template, open the export, and confirm it shows no editor attributes;
- open a document with a script: preview shows "Scripts running · isolated" after you allow it;
- one AI request on a cheap model (for example Claude Haiku) succeeds;
- `ingest/examples/traceable/report.html` and `ingest/examples/traceable/charts.html` open in the editor, and the Sources tab shows every number as "Matches".

### 2. Update the changelog

In `CHANGELOG.md`, rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`, add a new empty `## [Unreleased]` above it, and update the comparison links at the bottom of the file:

```
[Unreleased]: https://github.com/Lin830326/tactile-html-editor/compare/vX.Y.Z...HEAD
[X.Y.Z]: https://github.com/Lin830326/tactile-html-editor/compare/vPREVIOUS...vX.Y.Z
```

For the first release, link `[0.1.0]` to `https://github.com/Lin830326/tactile-html-editor/releases/tag/v0.1.0`.

Merge this change to `main` through a pull request titled `Release vX.Y.Z`.

### 3. Tag

```bash
git switch main
git pull
git tag -a vX.Y.Z -m "Tactile vX.Y.Z"
git push origin vX.Y.Z
```

Pushing the tag starts the release workflow. It fails, and creates nothing, when:

- the tag is not on `main`;
- the committed `dist/` does not match a fresh `node build.mjs`;
- a test fails;
- `CHANGELOG.md` has no `## [X.Y.Z]` section.

To retry after fixing the cause, delete the tag (`git push origin :refs/tags/vX.Y.Z` and `git tag -d vX.Y.Z`) and tag the fixed commit.

### 4. Review and publish the draft

The workflow creates a **draft** release with:

- `tactile.html`: the editor;
- `SHA256SUMS.txt`: its SHA-256 checksum;
- the changelog section as release notes.

Download `tactile.html` from the draft, check it against the checksum (`sha256sum -c SHA256SUMS.txt`), open it once, then publish the release. Publishing makes it the "latest" release, so the download link above serves it.

### 5. After publishing

- If the GitHub Pages demo is set up, check that it shows the new version.
- Close the milestone, if there is one, and announce the release.

## Releasing without the workflow

```bash
node build.mjs
git diff --exit-code -- dist/
(cd dist && sha256sum tactile.html > ../SHA256SUMS.txt)
gh release create vX.Y.Z dist/tactile.html SHA256SUMS.txt --draft --verify-tag \
  --title "Tactile vX.Y.Z" --notes-file notes.md
```

where `notes.md` holds the changelog section.

## Security releases

Fix reported vulnerabilities in the private fork that GitHub creates for a security advisory, not in a public branch. Release the fix as a patch version following the steps above, then publish the advisory so that the CVE and the release notes point to each other.

## Planned improvements

- **The command-line tool.** A release holds `tactile.html` only. `ingest/` is used from a checkout; publishing it as an npm package, with its own version, is not decided.
- **Version in the file.** The built HTML does not record its version yet. `build.mjs` writes the license notices into a comment at the top of `dist/*.html`. It should write the version there too, and somewhere the editor can show it.
- **Build provenance.** After the repository is public, add [`actions/attest-build-provenance`](https://github.com/actions/attest-build-provenance) so that users can verify that `tactile.html` was built by this workflow from the tagged commit.
- **Signed tags** (`git tag -s`).
