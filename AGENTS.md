# Agent instructions

`pstack-max` is a fork of [`michael-denyer/pstack-claude`](https://github.com/michael-denyer/pstack-claude),
which is itself a port of Poteto's pstack. The fork adds the OpenCode, T3 and Windows Copilot
support described in `README.md`. Upstream owns the skill content; this fork owns the translation and
the declared forks in `tools/forks.json`.

## Layout

- `plugins/pstack/`: the plugin. `skills/` is the shared skill tree every runtime reads.
- `tools/`: `generate.mjs` stamps generated files and validates the layout, `sync.mjs` syncs
  upstream, `upstream.json` pins the upstream SHAs, `forks.json` declares every deliberate fork.
- `tests/`: the Bun test suite.
- `CONTEXT.md`: upstream's domain glossary. Keep it; it is not agent instructions.
- `CHANGES.md`, `VERSION`: the release record and the canonical plugin version.
- `LICENSE`, `LICENSE-*`, `NOTICE*`: upstream licenses. Never edit or remove them.
- `docs/exceptions.md`: rules this fork cannot meet, with reasons and revisit dates.
- `lefthook.yml`: fork-local. Loads the shared hook jobs from `simpsonm09/.github` at `hooks-v3`
  and adds the fork's `generate` pre-commit job. See "Git hooks" below.

## Git hooks

The fork's hooks are Lefthook 2.2.2, loaded from `simpsonm09/.github` at the annotated tag
`hooks-v3` (`hooks/core.yml` and `hooks/owner.yml`). `just hooks` installs the shims and asserts
that `lefthook dump` contains the `core-*` and `owner-*` jobs.

Fork-local files that upstream sync must not overwrite or adopt:

- `lefthook.yml`, the hook recipes in `justfile`, the Lefthook and gitleaks pins in `mise.toml`,
  and `scripts/git-hook.ts`, `scripts/forbidden-files.ts`, `scripts/commit-msg.ts` and
  `scripts/deps-refresh.ts`.
- The `hooks` job in `.github/workflows/ci.yml`. Upstream owns the rest of that file and of
  `security.yml`; a sync that rewrites `ci.yml` must keep the `hooks` job, and a conflict there is
  resolved by keeping both upstream's jobs and this one.

The upstream-owned `.pre-commit-config.yaml` stays as upstream ships it. Do not run `prek install`
or `pre-commit install` in this clone: either would replace the Lefthook shims. The Lefthook
`generate` job runs the same `bun tools/generate.mjs --check` check before each commit.

## Commands

- `just` lists the recipes; `just install` installs the pinned tools and the root Bun dependencies.
- `just generate` runs `bun tools/generate.mjs --check`, CI's first job.
- `just fmt` / `just fmt-check` format and check the vendored tooling upstream formats.
- `just lint` runs `actionlint`, `zizmor` and `shellcheck`.
- `just typecheck` type-checks the vendored tooling; `just test` runs `bun test tests/`.
- `just check` is the local gate: `fmt-check`, `generate`, `lint`, `typecheck`, `test` and
  `agent-files`.
- `just hooks` installs the shared Lefthook hooks into `.git/hooks` for every worktree of this
  clone; it migrates only an old `.githooks` path and never changes global Git settings.

## Fork rules

- **Keep upstream's shape.** The default branch is `main`, the license files stay as they are, and
  `README.md`, `CHANGES.md`, `CONTEXT.md`, `package.json`, `bun.lock`, `plugins/` and `tools/` are
  upstream-owned. Do not reformat or restructure them.
- **Fork changes land on a branch and merge through a pull request.** Use `type/kebab-slug` for a
  fork change (`feat/`, `fix/`, `chore/`, `docs/`) and `sync/upstream-<version>` for an upstream
  sync. Never push to `main`.
- **Upstream syncs go through a pull request too.** Use `bun tools/sync.mjs <component> <sha>` and
  let CI's `Fork registry` job prove every fork is declared. Never resolve a sync by deleting a
  declared fork or by hand-editing a generated file.
- **Declare forks.** A deliberate departure from upstream needs an entry in `tools/forks.json` with
  a `kind`, a `why` and a `since`. Generated files are written by `tools/generate.mjs`, never by
  hand.

## Deliberate limits of this fork

- **Upstream CI is mostly unchanged.** `.github/workflows/ci.yml` and `security.yml` are
  upstream-owned and keep their Bun 1.3.14 pin, Windows/macOS jobs and Docker-based linters.
  The fork adds only the `hooks` job to `ci.yml`; changing anything else there would conflict on
  every sync. `just` mirrors the Linux checks that run locally.
- **`just check` is not the whole CI.** The Windows and macOS jobs, the Pi extension typecheck
  (needs the global Pi package), `markdownlint`, `lychee`, the OSV scan and the skills-only install
  run only in CI.
- **Dependency automation covers `github-actions` only.** The vendored
  `plugins/pstack/skills/poteto-mode/scripts/package.json` is upstream-owned and pins `latest`; a
  Dependabot entry for it would fight the sync boundary. The exception is recorded in
  `docs/exceptions.md`.

## Never

- Push to `main`. It is a public repository with the `protect-main` ruleset: work on a branch and
  merge a pull request.
- Skip hooks (C7.11): never set `LEFTHOOK=0`, never pass `--no-verify`, and never add a
  `lefthook-local.yml`. Hooks are advisory for humans; the ruleset and CI are the enforcement.
- Change GitHub settings, repository visibility or access from a workflow, script or agent run.
- Edit a generated file, a license file or an upstream-owned file by hand.
- Add a fork without a `tools/forks.json` entry, or remove an upstream file because a sync is noisy.
