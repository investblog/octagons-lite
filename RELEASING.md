# Releasing `octagons-lite`

Releases publish from GitHub Actions (`.github/workflows/release.yml`) using npm
**Trusted Publishing (OIDC)** — no npm tokens are stored anywhere, and every release
carries a **provenance** attestation linking the published tarball to the exact repo,
commit, and workflow run. Same mechanism as `@spintax/core`.

## One-time setup on npmjs.com (required before the first CI release)

1. Go to **npmjs.com → `octagons-lite` → Settings → Trusted Publisher**.
2. Choose **GitHub Actions** and fill in:
   - **Organization or user:** `investblog`
   - **Repository:** `octagons-lite`
   - **Workflow filename:** `release.yml`
   - **Environment:** *(leave blank)*
3. Save.

> **Caveat for the very first release.** `octagons-lite` has never been published, and
> npm's documentation does not say whether a trusted publisher can be configured for a
> package that does not exist yet. Try step 1 first. **If npmjs.com will not let you
> configure it** (no package page to open Settings on), do one manual publish to create
> the package, then come back and set up trusted publishing so every later release is
> tokenless:
>
> ```sh
> npm login          # interactive
> npm publish --access public
> ```
>
> That first manual publish has **no provenance** — provenance needs the OIDC path.
> Everything from the second release on will carry it.

Requirements, per npm docs: trusted publishing needs npm ≥ 11.5.1 and Node ≥ 22.14.0
(the workflow upgrades npm and pins Node 22), and provenance requires a **public**
repository — private repos get no attestation even for public packages. This repo is
public.

## Cutting a release

```sh
# 1. Bump the version
npm version patch   # 0.1.0 -> 0.1.1
npm version minor   # 0.1.0 -> 0.2.0

# 2. Push the commit and the tag (npm version creates the tag)
git push origin main
git push origin vX.Y.Z
```

Pushing the `vX.Y.Z` tag triggers `release.yml`, which lints, builds, verifies the tag
matches `package.json`, checks the tarball actually contains both entry files, and
publishes with provenance. It can also be triggered manually from the Actions tab
(**workflow_dispatch**) after tagging.

The tag/version check exists because a tag can point at any commit — the job re-runs the
gates rather than trusting that main was green.

## Verifying a release

- The npm page shows a **"Provenance"** section with the source commit and build.
- `npm view octagons-lite` reflects the new version.
- `npm audit signatures` (in a project that installed it) verifies the attestation.

## Notes

- Zero runtime dependencies. The tarball is the source file, the minified build, README
  and LICENSE — see `files` in `package.json`.
- **`octagons-lite.min.js` is gitignored**, per the `git-discipline` rule against
  committing generated artifacts, so it exists only at publish time. `prepublishOnly`
  rebuilds it, and the workflow additionally asserts it is present in the tarball —
  without that check a broken build would ship a package missing its own minified entry.
- Version stays in `0.x` while the option surface settles; `set()` semantics may still
  move, and `1.0.0` would claim a stability that has not been earned.
