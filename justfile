set shell := ["bash", "-euo", "pipefail", "-c"]
set positional-arguments

# List the recipes.
default:
    @just --list

# Install the pinned tools and the root Bun dependencies.
install:
    mise install
    bun install --frozen-lockfile

# Validate generated files and plugin invariants, as CI's first job does.
generate:
    bun tools/generate.mjs --check

# Lefthook re-stages the fixes (`stage_fixed`).
# Only the vendored tooling upstream formats is formatted. The hook's staged
# files include upstream-owned Markdown and YAML, which must not be rewritten;
# the no-argument form is the repository-wide check.
fmt *files:
    #!/usr/bin/env bash
    set -euo pipefail
    if (( $# )); then
        exit 0
    fi
    cd plugins/pstack/skills/poteto-mode/scripts && bun x prettier@3.6.2 --write .

# Fail if that tooling needs formatting.
fmt-check:
    cd plugins/pstack/skills/poteto-mode/scripts && bun x prettier@3.6.2 --check .

# Lint the workflows and shell scripts. The hook only passes files the core
# lint job covers; upstream has no JavaScript linter.
lint *files:
    #!/usr/bin/env bash
    set -euo pipefail
    if (( $# )); then
        exit 0
    fi
    just lint-workflows
    just lint-shell

lint-workflows:
    mise exec -- actionlint
    mise exec -- zizmor --persona pedantic --min-severity low .github/workflows

lint-shell:
    #!/usr/bin/env bash
    set -euo pipefail
    find . -path ./.git -prune -o -path '*/node_modules' -prune -o -name '*.sh' -print |
        sed 's#^\./##' | sort | xargs mise exec -- shellcheck --severity=warning

# Type-check the vendored tooling. The Pi extension needs the Pi package and
# runs only in CI (see AGENTS.md).
typecheck:
    cd plugins/pstack/skills/poteto-mode/scripts && bun install --frozen-lockfile && bun run typecheck

# Run the test suite.
test:
    bun test tests/

# Staged secret scan; gitleaks never prints a finding value.
[private]
secrets-staged:
    mise exec -- gitleaks git --staged --redact --no-banner

# Reject env files, private keys, kubeconfigs and files over 5 MB.
forbidden-files *files:
    #!/usr/bin/env bash
    set -euo pipefail
    bun scripts/forbidden-files.ts "$@"

# actionlint and zizmor over the given workflows, or every workflow.
workflows *files:
    #!/usr/bin/env bash
    set -euo pipefail
    if (( $# )); then
        mise exec -- actionlint -- "$@"
        mise exec -- zizmor --persona pedantic --min-severity low "$@"
    else
        mise exec -- actionlint
        mise exec -- zizmor --persona pedantic --min-severity low .github/workflows
    fi

# shellcheck over the given scripts, or every script upstream lints.
shellcheck *files:
    #!/usr/bin/env bash
    set -euo pipefail
    if (( $# )); then
        mise exec -- shellcheck --severity=warning "$@"
    else
        just lint-shell
    fi

# Check the agent skill files: frontmatter, recipes and the .claude symlinks.
agent-files:
    bun scripts/agent-files.ts

# Advisory Conventional Commit check (C2.4); never fails the commit.
commit-msg file:
    bun scripts/commit-msg.ts {{ quote(file) }}

# Effective author and committer emails are the owner's GitHub no-reply address.
privacy-identity:
    bun scripts/git-hook.ts privacy-identity

# The exact staged blobs.
privacy-staged:
    bun scripts/git-hook.ts privacy-staged

# The checkout can sign commits: commit.gpgsign=true and a signing key are set.
signing-check:
    #!/usr/bin/env bash
    set -euo pipefail
    if [[ "$(git config --get commit.gpgsign || true)" != "true" ]]; then
        printf 'commit.gpgsign is not true for this checkout.\n' >&2
        exit 1
    fi
    if [[ -z "$(git config --get user.signingkey || true)" ]]; then
        printf 'user.signingkey is not set for this checkout.\n' >&2
        exit 1
    fi

# Refuse a push to main, refuse unsigned commits, scan the exact pushed range.
[private]
hook-pre-push:
    mise exec -- bun scripts/git-hook.ts pre-push

# Fast subset for pre-push (C7.10): generated files and plugin invariants.
pre-push-check:
    just generate

# Refresh the pinned tools when mise.toml changed (post-checkout, post-merge).
deps-refresh:
    bun scripts/deps-refresh.ts mise.toml

# Refuses a global or foreign core.hooksPath; migrates only `.githooks`.
# Enable the shared Lefthook hooks without changing global Git settings.
hooks:
    #!/usr/bin/env bash
    set -euo pipefail

    if ! mise exec -- lefthook version >/dev/null 2>&1; then
        printf 'lefthook is not installed; run `mise install` first.\n' >&2
        exit 1
    fi

    global=$(git config --global --get core.hooksPath || true)
    if [[ -n "$global" ]]; then
        printf 'A global core.hooksPath is set (%s); lefthook install refuses it.\n' "$global" >&2
        printf 'Remove it yourself, or use `lefthook install --force` only if you really mean it.\n' >&2
        exit 1
    fi

    existing=$(git config --get core.hooksPath || true)
    case "$existing" in
        ""|.githooks) ;;
        *)
            printf 'core.hooksPath is %s; integrate it manually.\n' "$existing" >&2
            exit 1
            ;;
    esac

    if [[ "$existing" == ".githooks" ]]; then
        git config --unset-all --local core.hooksPath
    fi

    mise exec -- lefthook install
    # A failed remote fetch only warns in 2.2.2 and still exits 0, so assert the
    # shared jobs loaded before declaring success.
    dump=$(mise exec -- lefthook dump)
    if ! grep -q 'name: core-' <<<"$dump" || ! grep -q 'name: owner-' <<<"$dump"; then
        printf 'The shared hook config did not load; check access to the .github repository.\n' >&2
        exit 1
    fi
    hookdir=$(git rev-parse --path-format=absolute --git-path hooks)
    if [[ ! -x "$hookdir/pre-commit" || ! -x "$hookdir/pre-push" ]]; then
        printf 'Lefthook did not write the pre-commit and pre-push shims.\n' >&2
        exit 1
    fi
    mise exec -- lefthook validate
    printf 'Shared Lefthook hooks installed; no global settings changed.\n'

# Everything that runs locally from the checks upstream's CI requires.
check: fmt-check generate lint typecheck test agent-files
