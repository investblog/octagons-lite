# REGISTRY — project adaptation log

WHY something was added/changed. The WHAT graph lives in `map.yaml` — not duplicated here.

## 2026-07-18 — bootstrap from `~/.agents` (fresh project)

Uninitialized folder (no `.git`, no `AGENTS.md` anywhere up the tree), so the full
fresh-project path ran, not migration mode.

- **Domains:** `coding` (user choice). Same set as the sibling `trigons-lite`.
  `qa` was offered and declined; browser verification is still the working method here
  (see the behavioural rule in `AGENTS.md`), just without the `browser-use` rule attached.
- **MCP:** none. The baseline library's only MCP is `playwright`, marked `scope: global`,
  so it stays machine-level and is deliberately NOT rendered into `./.mcp.json`.
  Consequently no `./.mcp.json` exists.
- **Claude config:** only `./.claude/settings.json` (committed chain hooks). No
  `settings.local.json` — no project-specific permission overrides worth pinning.
- **`./CLAUDE.md`:** a real symlink → `./AGENTS.md`, created with PowerShell
  `New-Item -ItemType SymbolicLink`. Git Bash `ln -s` silently **copies** on this machine
  (MSYS fallback) — do not use it for the anchor.
- **Hook shell:** rendered as the absolute `W:\Program Files\Git\bin\bash.exe`, not bare
  `bash`, which here can resolve to the WSL launcher and fail with no distro installed.
- **Fresh-init files:** `.gitignore` from the baseline template, plus `.gitattributes`
  (`* text=auto eol=lf`) and `.editorconfig`. Created because this is a fresh `git init`,
  where pinning LF is ours to decide — the POSIX hook scripts break on CRLF checkout.

### Added: `eslint.config.js` and `package.json` (not from the library)
Both exist to make the **mandatory** git quality gate actually work, and both were added
only after observing it fail:

- ESLint 9 hard-fails with no flat config, which would block every commit.
- More seriously: `git-quality-gate/gate.sh` line 52 gates its **entire** JS pipeline —
  lint, typecheck, build, test — behind `if [ -f package.json ]`. Without one the gate
  ran only `bash -n` over the shell scripts and reported **ok** while never touching the
  library source. A silently passing gate is worse than a failing one.

Verified after the fix: `npx eslint . --format json` reports 2 files linted
(`octagons-lite.js`, `eslint.config.js`), 0 errors, and the pre-commit hook now runs
`npm run -s lint`.

Config is minimal and matches the code as written: `ecmaVersion: 5`, `sourceType: script`
(ES5 IIFE), CommonJS, browser globals declared by hand rather than adding the `globals`
package — the library is advertised as zero-dependency.

`tsc` is absent, so the push gate skips type-check and says so. Correct for a plain-JS
library; do not add TypeScript merely to satisfy the gate.

### Decisions — now confirmed (2026-07-18)
- **Package name** `octagons-lite` — confirmed.
- **License MIT, copyright 301ST (https://301.st)** — confirmed; `LICENSE` written.
- **Repository** `github.com/investblog/octagons-lite`, public. Chosen over the
  `admin310st` account, which was also authenticated, so that it sits next to the
  sibling `trigons-lite`.
- `"private": true` is **still set** in `package.json`. It blocks `npm publish`
  outright and is deliberately kept as a guard until npm release is actually decided;
  removing that one line is the whole change.
- `prepublishOnly` runs the build, because `octagons-lite.min.js` is gitignored (see
  `git-discipline`) yet listed in `files` — publishing without it would ship a package
  missing its own minified entry.
