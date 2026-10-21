# pstack reference

Start with the [README](../README.md) for installation and your first task.

## Slash commands

The package includes 65 skill directories: 41 public skills and 24 `principle-*` references. Claude Code uses `/pstack:<name>`, Pi uses `/skill:<name>`, and Muse lists each user-invocable skill as `/<name>`. In Codex, request a skill by name or install the [optional shortcuts](#codex) for the `/name` form below.

Find each skill's instructions in the [skills tree](../plugins/pstack/skills/).

| command | use it when |
| --- | --- |
| `/poteto-mode` | default entry point for any non-trivial task |
| `/how` | walk through how a subsystem works |
| `/why` | investigate why something was built this way (parallel multi-MCP evidence) |
| `/architect` | settle types and module shape before writing code that crosses a function boundary |
| `/arena` | run N parallel attempts at the same task and pick the best parts |
| `/interrogate` | have three different models try to break a diff |
| `/automate-me` | draft your own personal -mode skill from recent transcripts |
| `/reflect` | capture a long task's lessons as a skill edit |
| `/correct` | find the mistakes agents keep repeating in a repo and make each one impossible, enforced at the highest level that works |
| `/tdd` | fix a bug by writing the failing test first, then the fix |
| `/benchmark-checklist` | vet a measured speedup or regression (limiter, tuning, errors, repeat runs, end-to-end relevance) before you report or act on it |
| `/typescript-best-practices` | ground type-system discipline in TypeScript syntax |
| `/teach` | explain a subsystem plainly by composing how + why |
| `/swarm` | fan out N parallel workers across slices or races, then return one aggregated report |
| `/technical-writing` | write docs, RFCs, readmes, PR descriptions, and commit messages to one layered standard |
| `/bro` | restate the last message in plain human language, no jargon |
| `/in-your-own-words` | play back your goal and the problem before the agent starts |
| `/sharpen` | aim a task at what you are really after, the way a top expert would, without overspecifying it |
| `/figure-it-out` | design a rigorous, auditable playbook for a task no bundled playbook fits |
| `/show-me-your-work` | log decisions to a reviewable tsv decision trail |
| `/blast-radius` | find what a change could break beyond the diff and prove safety by running code |
| `/recall` | catch up on recent working context from chat history, live state, and the shared record |
| `/ketchup` | catch up on everything in this chat since your last message, with an executive summary for each action item |
| `/setup-pstack` | configure pstack per-role model choices |
| `/poteto-help` | answer a question about pstack with the prompt to send and the file the answer came from |
| `/unslop` | clean up writing by removing AI tells |
| `/no-comments` | strip comments before review, fix the accepted findings, encode claimed constraints |
| `/create-verification-skill` | generate a project-local verification skill and feature map |
| `/maintain-verification-skill` | re-sync a drifted verification skill and its feature map |
| `/create-formal-verification-skill` | generate a project-local skill that formally verifies one high-risk property |
| `/maintain-formal-verification-skill` | re-sync a formal verification after the code it covers changed |
| `/deslop` | deslop a diff before commit |
| `/babysit` | monitor an open PR, fix CI/comments, keep it merge-ready |
| `/thermo-nuclear-review` | audit a branch's changes for bugs, breakage, security issues, devex regressions, and feature-gate leaks |
| `/thermo-nuclear-code-quality-review` | extremely strict maintainability audit |
| `/thermos` | run both thermo-nuclear reviews as parallel subagents and synthesize their findings |
| `/make-pr-easy-to-review` | clean noisy history and improve PR description before review |
| `/fix-ci` | find failing PR checks, inspect logs, apply focused fixes |
| `/fix-merge-conflicts` | non-interactively resolve merge conflicts, validate, finalize |
| `/get-pr-comments` | fetch and summarize review comments from the active PR |
| `/what-did-i-get-done` | summarize authored commits over a user-chosen period |

## Runtime support

All runtimes share [one skills tree](../plugins/pstack/skills/). A skills-only installation includes the skills, scripts, agent references, and license notices. The Claude Code, Codex, GitHub Copilot, and Muse plugins also install automatic routing hooks, and the Pi package adds an extension that injects the same routing and supplies the subagent tools. The OpenCode plugin entry registers the skills, injects the routing, and ships the agent profiles that run subagents. Codex command shortcuts are separate.

| Runtime | Setup and recorded verification |
| --- | --- |
| Claude Code | Install the marketplace plugin (Claude Code 2.1.292 or later). Skills use Claude tool names and model defaults; the plugin installs automatic routing. |
| Codex | Install the native plugin through the repository's marketplace and trust its hook through `/hooks`. The [Codex mapping](../plugins/pstack/skills/poteto-mode/references/codex-tools.md) translates Claude tools and model names. Shared skill symlinks were also detected in a live session. |
| Pi | Install the repository as a Pi package with `pi install`. The [Pi extension](../plugins/pstack/pi/index.ts) registers the subagent, question, and wake-up tools and `/loop`, and the [Pi mapping](../plugins/pstack/skills/poteto-mode/references/pi-tools.md) translates Claude tools and model names. The [equivalence table](pi-equivalence.md) records each Claude Code mechanism and how it was verified on Pi 1.1. |
| GitHub Copilot | Install the plugin through the repository's marketplace; the CLI and the GitHub Copilot app share it. The [Copilot mapping](../plugins/pstack/skills/poteto-mode/references/copilot-tools.md) translates Claude tools, paths, and model roles, and maps app-only tools to CLI fallbacks. Install, routing, agent dispatch, and first-run setup are smoke-tested on the CLI; see [GitHub Copilot](#github-copilot). |
| Muse | Install the native plugin bundle with `muse plugins install`, then approve its hooks and agent definitions with `muse plugins approve pstack`. The [Muse mapping](../plugins/pstack/skills/poteto-mode/references/muse-tools.md) translates Claude tools, subagents, transcripts, and model roles. See [Muse](#muse). |
| Prime Agent | Its documentation describes shared-directory discovery; it has not been tested in a live session. Choose tools and models through Prime's configuration. |
| opencode | The [OpenCode build](#opencode) is a plugin entry that registers the shared skills and injects the routing, with three agent profiles and an [OpenCode mapping](../plugins/pstack/skills/poteto-mode/references/opencode-tools.md). Its files and checks run offline; no live OpenCode 2.0 session has run them. Discovery of a linked skill was verified on version 1.18.25. Separately, discovery and skill loading were verified on version 2.0.30 in the CLI and the desktop app, and delegation through the `subagent` tool in the CLI; configure agents, commands, and permissions in `opencode.json`, and its picker also lists principle skills. |
| Gemini CLI | Its documentation describes shared-directory discovery; it has not been tested in a live session. Use `/skills list` to check discovery and `/skills reload` after changes. |
| T3 Code | Optional overlay. A live tool-list check controls whether T3 dispatch is used. See [Inside T3 Code](#inside-t3-code). |

These checks cover skill discovery. Delegation remains unverified on Prime Agent and Gemini CLI, and multi-model workflows on all three. The OpenCode row's 2.0.30 checks cover skill discovery and the native `subagent` tool, not the [OpenCode build](#opencode), whose own files and checks run offline. On those runtimes, agents must adapt Claude-specific tools, models, and configuration. Each mapping applies only to its runtime.

### Inside T3 Code

The T3 overlay is optional. Before dispatch, a skill checks the live tool list for both final name segments `delegate_task` and `orchestrator_capabilities`. If either is absent, the host mapping and native model sheet apply unchanged. If both are present, [the T3 mapping](../plugins/pstack/skills/poteto-mode/references/t3-tools.md) controls dispatch, models, schedules and pull request watching.

Run `setup-pstack` in that session to choose targets and options. The allow-list can mark instances as read-only for the documented review and research roles; setup labels those instances and offers them only for those roles. If the allow-list is absent, setup warns that children may run without the pstack layer or access gate. Unset roles inherit the parent's model.

Starting at the session's working directory and walking up its parent folders, use the first `.pstack` folder that contains either T3 file. Read both files from that same folder; a missing file there is absent and does not fall back to the host. If no such folder exists, use the host's per-user config folder.

Claude Code and Codex are documented T3 dispatching parents. OpenCode exposes the tools in a measured session, but a dispatch has not been measured. Copilot and Pi remain unverified as parents.
### Automatic routing

The Claude Code, Codex, and GitHub Copilot plugins load the same short [routing instruction](../plugins/pstack/hooks/session-start-context.md) on startup, resume, clear, and compact. The Muse plugin loads its [Muse wording](../plugins/pstack/hooks/session-start-muse.md) of the same instruction. The [POSIX hook](../plugins/pstack/hooks/session-start.sh) runs on Claude Code, POSIX Codex, and GitHub Copilot, where it prints the instruction as JSON `additionalContext` with a Copilot addendum, and on Muse, where it prints plain text. On Windows, Codex uses a [PowerShell adapter](../plugins/pstack/hooks/session-start.ps1) through its `commandWindows` override, and Copilot uses one through its `powershell` key, so neither needs Bash; see [native Windows hooks](#native-windows-hooks). The adapter runs with `-ExecutionPolicy Bypass`, which a machine or user execution policy set by Group Policy overrides; on such machines the hook fails and no instruction loads. Codex requires the user to trust plugin hooks through `/hooks`. On Pi, the [extension](../plugins/pstack/pi/prompt.ts) adds the same instruction to the system prompt at every agent start, so it survives compaction. The instruction invokes `poteto-mode` when a task meets any of these conditions:

- It touches more than one file or changes a signature other files call.
- It involves a design or architecture choice.
- It concerns a bug with an unknown cause or a performance issue.

Smaller tasks proceed directly. The full skill loads when invoked, and explicit user instructions take precedence.

To disable routing, run `setup-pstack` and turn off the session hook. In Claude Code, use `/pstack:setup-pstack`. You can also write `session hook: off` in the runtime's sheet, at the path in [setup-pstack's runtime table](../plugins/pstack/skills/setup-pstack/SKILL.md#other-runtimes). The hook reads that setting before injecting its instruction. Without the setting, routing stays on.

The [OpenCode plugin entry](../plugins/pstack/opencode/index.ts) adds the same instruction to every session's context, with a pointer to the OpenCode mapping instead of the Claude Code hook's text. Set its `routing: false` option to turn it off.

Skills-only installs and other runtimes do not include the hook, the Pi extension, or the OpenCode plugin entry. Request `poteto-mode` explicitly, or add a standing instruction to the runtime's instruction file.

### Native Windows hooks

Codex and GitHub Copilot run a PowerShell form of their session hook on Windows, so neither needs Bash there. The other runtimes differ:

| Runtime | Session hook on Windows | Other hooks on Windows |
| --- | --- | --- |
| Claude Code | The POSIX [`session-start.sh`](../plugins/pstack/hooks/session-start.sh). It has no PowerShell form and needs a POSIX shell. Not checked on Windows. | None |
| Codex | The [`session-start.ps1`](../plugins/pstack/hooks/session-start.ps1) adapter, through `commandWindows`. | None |
| GitHub Copilot | The [`session-start-copilot.ps1`](../plugins/pstack/hooks/session-start-copilot.ps1) script, through the `powershell` key. | [`pre-tool-use-windows.ps1`](../plugins/pstack/hooks/pre-tool-use-windows.ps1) makes no decision. The POSIX rules in `pre-tool-use.sh` have no PowerShell port. |
| Pi, OpenCode | Not a shell hook. Each is a TypeScript extension or plugin entry. | Not applicable |

Copilot's hooks file uses Copilot's native flat form. Each hook names both a `bash` command and a `powershell` command. Copilot runs the `bash` command on Windows through `/bin/bash`, where `COPILOT_PLUGIN_ROOT` is not set, so a hook with no `powershell` command fails there.

The PowerShell scripts run with `-ExecutionPolicy Bypass`, as the Codex adapter does, under Windows PowerShell 5.1 and PowerShell 7. The Copilot session hook prints the same JSON as the POSIX hook for the same model sheet. Windows has no `view` approval, no script approval, and no `task` model check, because the POSIX rules are not ported.

### Shared skills installation

Use this path for Prime Agent, opencode without the [OpenCode plugin entry](#opencode), Gemini CLI, or a skills-only Codex installation. Run the script under [Other harnesses](../README.md#other-harnesses) in the README, which clones the repository and links its skills into `~/.agents/skills/`.

Keep all skill directories, including the principle references. Leave the clone at this path while the links are installed.

### Manage linked skills

If a destination already exists, inspect it before replacing it. The installation skips existing files, directories, and links.

To update, run `git pull` in the clone that the links point to, then run the install loop again. A pull updates skills that are already linked but does not link new skill directories. To uninstall a linked skill, remove its link at `~/.agents/skills/<name>`. This removes it from every runtime using that directory.

### Install with the skills CLI

To install without keeping a local clone:

```shell
npx skills add https://github.com/michael-denyer/pstack-claude/tree/main/plugins/pstack/skills --skill "*" --agent "*" --yes
```

The [CI installation check](../.github/workflows/ci.yml) uses the skills CLI to copy the checkout's skill tree and compare the installed files with their sources.

### Codex

The [native plugin manifest](../plugins/pstack/.codex-plugin/plugin.json) points to the shared skills directory and the Codex [SessionStart hook](../plugins/pstack/hooks/codex-hooks.json). The [marketplace catalog](../.agents/plugins/marketplace.json) lists `pstack` in the `pstack-claude` marketplace. Review and trust the hook through `/hooks`; Codex asks again when its definition changes.

The [README installation](../README.md#codex) registers that catalog with `codex plugin marketplace add`, then installs the plugin with `codex plugin add`. These commands match the help output from `codex-cli 0.154.0-alpha.6.2`. A fresh native installation was not tested for this documentation change.

OpenAI documents [marketplace registration and the plugin format](https://developers.openai.com/plugins/build/plugins#add-a-marketplace-from-the-cli). If your CLI lacks `plugin add`, use the plugin browser after registering the marketplace, or use the [skills-only installation](#shared-skills-installation).

Request `poteto-mode` by name or select its entry, such as `pstack:poteto-mode`. To enable parallel subagents:

```toml
[features]
multi_agent = true
```

Add this setting to `~/.codex/config.toml` if subagents are disabled. Skills such as `arena`, `interrogate`, and `architect` use parallel agents. The [mapping](../plugins/pstack/skills/poteto-mode/references/codex-tools.md) describes a sequential fallback and translates Claude tool names, model defaults, and verification instructions.

For optional slash-command shortcuts, run this from the clone's root:

```shell
mkdir -p ~/.codex/prompts
for c in plugins/pstack/.codex-plugin/prompts/*.md; do
  target=~/.codex/prompts/"$(basename "$c")"
  test -e "$target" || test -L "$target" || ln -s "$(pwd)/$c" "$target"
done
```

Each shortcut invokes its skill. The commands skip existing files and links. Remove a shortcut by deleting its link at `~/.codex/prompts/<name>.md`. Both native-plugin and skills-only installations work without these shortcuts.

### Pi

The repository root is a [Pi package](https://pi.dev/packages): its [`package.json`](../package.json) lists the shared skills directory and the [pstack Pi extension](../plugins/pstack/pi/index.ts). Install it with `pi install git:github.com/michael-denyer/pstack-claude`, or `pi install <clone path>` for a local checkout.

The extension supplies what Pi lacks natively, under the Claude Code names the skills use:

- `agent` dispatches a child `pi --mode rpc` process with the skill's `subagent_type`, model, and effort, in the foreground or background, optionally in its own git worktree. A background agent's completion joins the running turn after its current tool calls, or starts a turn when the session is idle.
- `send_message`, `list_agents`, and `stop_agent` message, list, and stop those agents. A message to a running agent is an RPC `steer` on the child's stdin, which the agent reads after its current tool calls before it carries on in the same run. A finished agent resumes with the message. An agent's status follows its process. `list_agents`, a foreground agent's result, and each completion notice name the child's transcript, `<timestamp>_<session id>.jsonl` under `<agent dir>/pstack/<parent session id>/agents/`, so a user can follow a running agent with `tail -f` or render a finished one with `pi --export`. A running agent's `list_agents` entry also carries `activity`, its current or last tool call and its latest message, read from the child's RPC events and kept in memory, so the model sees it only in a `list_agents` result. The top-level session shows the count and the most recently active agent in a `pstack-agents` footer line, and the user can run `/pstack-agents` for a per-agent view that is not sent to the model.
- `ask_user_question` and `schedule_wakeup` match `AskUserQuestion` and `ScheduleWakeup`, and `/loop` matches the `loop` skill. In a child agent, asking a question and scheduling a wakeup both return an error.
- At every agent start it adds the routing instruction, the override sheet `~/.pi/agent/pstack-models.md`, and a pointer to the Pi mapping to the system prompt.

Family names such as `opus` resolve through the `pi` block of [`models.json`](../plugins/pstack/models.json) to model IDs for the provider the Pi session runs on. A ChatGPT sign-in (`openai`, or the legacy `openai-codex`) gets OpenAI models, and Anthropic or any other provider gets Claude models. Pi warns that Anthropic bills Claude used through Pi per token, as extra usage, even on a Claude subscription, and every subagent pstack starts adds to that bill. Run pstack in Claude Code to stay within a Claude plan's limits. A `pi models:` line in the sheet remaps any family name. The [Pi mapping](../plugins/pstack/skills/poteto-mode/references/pi-tools.md) lists every translation, and the [equivalence table](pi-equivalence.md) records what was verified and how.

### GitHub Copilot

The Copilot CLI reads the Claude Code [marketplace](../.claude-plugin/marketplace.json). For the plugin it looks for `.github/plugin/plugin.json` before `.claude-plugin/plugin.json`, so pstack ships a [Copilot manifest](../plugins/pstack/.github/plugin/plugin.json) whose `hooks` field names [`hooks/copilot-hooks.json`](../plugins/pstack/hooks/copilot-hooks.json). Copilot then skips the Claude Code `hooks/hooks.json`, so each hook runs once, and Claude Code keeps reading its own manifest. The GitHub Copilot app loads plugins installed into `~/.copilot`; a manual app check of routing, first-run setup, agent dispatch, `session hook: off`, and the app-only tools passed on 2026-09-25. To try a local checkout, pass its absolute path to `copilot plugin marketplace add`. Skills load by bare name through the `skill` tool, and a user types `/pstack:<skill>` in the CLI prompt; the agents keep their prefix, `pstack:poteto-agent` and `pstack:comment-sicko`.

Copilot's hooks file runs the [SessionStart hook](../plugins/pstack/hooks/session-start.sh) with the `copilot` argument through its `bash` command, and the [PowerShell hook](../plugins/pstack/hooks/session-start-copilot.ps1) through its `powershell` command on Windows. Both print JSON `additionalContext`: the routing instruction plus a [Copilot addendum](../plugins/pstack/hooks/session-start-copilot.md). It reads the model sheet, which sits outside Copilot's path sandbox, and checks it with the [same POSIX `awk` validator](../plugins/pstack/skills/setup-pstack/scripts/sheet.awk) that `setup-pstack` runs through `check-sheet.sh` after it writes the sheet. The PowerShell hook applies the same checks to the same role list, which `generate` stamps from `models.json`. A valid sheet adds one line per known role, rebuilt from the checked values, so no other sheet text reaches the context. An invalid sheet adds `sheet invalid:` with each problem, and a missing sheet adds a note; both tell the session to run `setup-pstack` first. A second hook, [`pre-tool-use.sh`](../plugins/pstack/hooks/pre-tool-use.sh) with the matcher `view|task|bash`, does three things on Copilot. It approves reads inside the plugin directory so playbooks and references load without a path-access prompt. It approves registered scripts with their declared argument contracts and matching interpreters, using a strict command form with no shell metacharacters. It checks path operands separately from prose fields; unknown scripts and argument forms take the normal permission flow. Setup, SessionStart, and PreToolUse share one sheet decoder, including UTF-16LE support. While the sheet is valid, it denies a `pstack:*` `task` call whose `model` is not one of the saved choices, with the saved IDs in the reason. It stays silent on everything else and always exits 0, because Copilot denies a tool call when the hook fails; an `awk` error still reaches stderr. On Windows its PowerShell command, [`pre-tool-use-windows.ps1`](../plugins/pstack/hooks/pre-tool-use-windows.ps1), makes no decision and exits 0, so none of the three rules applies there and each call takes the normal permission flow. Copilot runs plugin hooks on every session start, so the Claude matcher does not apply. The hook runs lazily, after the first message is submitted and before the first model turn, including when that message is a slash command such as `/pstack:arena`. A resumed session runs it again with source `resume`, and the model still sees one routing block. On CLI 1.0.87 through 1.0.92, the context of several plugins' session-start hooks merges ([github/copilot-cli#3589](https://github.com/github/copilot-cli/issues/3589) reported that only the last one survived). If a version drops the merge, use the standing instruction from `setup-pstack`. On 1.0.92, when the CLI's cached experiment assignment turns on computer use, `-p` sessions load no plugin skills while interactive sessions still do; the smoke test clears that cache before each `-p` probe.

pstack ships no default Copilot models, because the models an account reaches depend on its plan and policy. The first skill that dispatches on role models runs `setup-pstack`. It asks one `ask_user` question per tier and panel slot, each a short list drawn from the `task` tool's models and grouped by vendor, and recommends no model. It then writes `${COPILOT_HOME:-~/.copilot}/pstack-models.md` and runs `check-sheet.sh`, and later sessions receive its choices from the hook. Choose panel models from distinct vendors. A role value's `@<level>` suffix and the sheet's `default effort` line map to the `task` tool's `reasoning_effort`.

Copilot lists only part of a large plugin's skills in its prompt, so some pstack skills do not appear there; each one still loads by name. If another hook or a skills-only install displaces the routing instruction, `setup-pstack` offers a standing instruction for `~/.copilot/copilot-instructions.md`.

[`tests/copilot-smoke.sh`](../tests/copilot-smoke.sh) installs the checkout into a throwaway `COPILOT_HOME` and checks installation, routing, `session hook: off`, agent dispatch with an explicit model, first-run setup, that setup writes no sheet without the user's answers and exactly the supplied IDs with them, and that saved choices and plugin files reach a session without `--allow-all-paths` or any path-access request, from each session's `events.jsonl` and the written sheet. It runs the setup checks once per model in `SMOKE_SETUP_MODELS`. It also checks the `PreToolUse` deny, a vendored script and `check-sheet.sh` run with no permission request, that an injected sheet line stays out of the context, that an invalid sheet yields `sheet invalid`, that each hook fires once, the merge with a second plugin's session-start context, a `-p` resume, and, on a pseudo-terminal through [`tests/copilot-tui.py`](../tests/copilot-tui.py), a slash-command first message and an interactive resume. It needs a signed-in `copilot` CLI, spends about twenty premium requests, and skips when `copilot` is missing. CI does not run it.

### Muse

The Muse build is a native Muse plugin bundle rooted at `plugins/pstack/`. Its [manifest](../plugins/pstack/.muse-plugin/plugin.json) lists every shared skill as a skill capability and one inline `SessionStart` hook that runs the shared hook script with the `muse` argument. The generator owns the manifest's skill list, so it always matches the tree. Muse rejects a command whose id duplicates a skill id, so the build ships no command templates: Muse lists each user-invocable skill as `/<name>` itself, and plugin skills load with `read_skill` as `plugin:pstack:<name>`.

Install from a clone as the [README](../README.md) shows, then approve the plugin. Muse runs third-party hooks and agent definitions only after `muse plugins approve pstack`; until then the skills work on request and nothing routes automatically. Once approved, the hook prints the [Muse routing instruction](../plugins/pstack/hooks/session-start-muse.md) as plain additional context, plus the saved role lines from `${XDG_CONFIG_HOME:-~/.config}/muse/pstack-models.md` when the sheet has any. Only known role lines whose entries are model IDs or aliases reach the context, rebuilt from their checked values. `session hook: off` in the sheet disables the injection, as on the other runtimes.

Muse caps its skill catalog at 32 KB, so with pstack's 65 skills installed it compacts descriptions to fit; no skill id is dropped, and every skill still loads by name. The plugin's four `agents/` files register as Muse agent definitions under scoped ids such as `pstack/poteto-agent`, so poteto-mode's dispatches resolve as written, through the Muse mapping. A role's effort suffix passes as a Workflow child's `effort`, the Muse form of the dispatch effort field every runtime now uses. The Muse block of `models.json` gives a Muse model per tier; `subagent_spawn` takes a definition rather than a model, so per-role models apply where the dispatch takes one (a Workflow child's `model`), and the mapping says so. The `typescript-best-practices` skill's `paths` frontmatter is metadata on Muse, so `muse skills validate` reports it as an unsupported-field warning while the skill stays valid.

Update an installed copy after a `git pull` with `muse plugins update pstack`, and re-approve when Muse asks, since approval is pinned to the hook and agent definitions it first saw. Remove it with `muse plugins remove pstack`.

### OpenCode

The OpenCode build has three parts: a plugin entry, three agent profiles, and an [OpenCode mapping](../plugins/pstack/skills/poteto-mode/references/opencode-tools.md) that translates the Claude names the skills use. It replaces the separate `pstack-opencode` package, which carried its own copy of the skills. This build reads the shared tree instead, so one checkout serves every runtime.

- The [plugin entry](../plugins/pstack/opencode/index.ts) registers every skill under [`plugins/pstack/skills/`](../plugins/pstack/skills/) by directory name. It resolves that tree as `../skills` from its own file, so the tree must sit beside the plugin directory. Without it the entry registers no skills and logs a warning.
- The entry imports `@opencode/plugin`. Its [`package.json`](../plugins/pstack/opencode/package.json) pins version 2.0.18, so install that exact version in the directory that holds the entry.
- The [agent profiles](../plugins/pstack/opencode/agents/) are `pstack-agent` (the worker), `pstack-reviewer` (read-only), and `pstack-comment-sicko` (read-only comment review). Copy them into the workspace's `.opencode/agents/`, or into `~/.config/opencode/agents/`. They carry no `model:` line, so each runs on the session's model. The mapping names these IDs.
- The routing instruction names the mapping file by its absolute path, so an agent reads the mapping instead of loading a separate `pstack-opencode` skill.
- No model is shipped. A subagent takes the session's model. To run one role on another model, add a `model:` line naming a `provider/model` ID to a profile you own, then check the model that a fresh subagent reports.

A workspace installer needs to do four things:

1. Copy `plugins/pstack/opencode/` and `plugins/pstack/skills/` into the workspace so that `skills/` sits beside the plugin directory, for example `.opencode/plugins/pstack-opencode/` and `.opencode/plugins/skills/`. Copying only the plugin directory leaves the entry with no skills.
2. Run `npm install`, or `bun install`, in the plugin directory to install `@opencode/plugin`.
3. Copy `agents/*.md` into `.opencode/agents/`, and do not edit a `model:` line into them.
4. Start a new session.

This layout follows the separate port's installer. Whether OpenCode 2.0 loads an entry from these paths was not verified for this build.

The offline checks cover the entry's frontmatter parsing, skill loading, routing text, and registration against a stubbed context, and the generator's validator covers the files, the dependency pin, the profiles, and the mapping's names. A live OpenCode 2.0.x session has not yet checked that OpenCode loads the entry, that `skill.transform` and `session.hook("context")` accept the calls the entry makes, the `subagent`, `question`, `webfetch`, and `websearch` tool names and the `background` field, the permission names in the profiles, that the agent IDs resolve from `.opencode/agents/`, or that a subagent reports the model it inherits. Run one live session before relying on the build.

## Configuration and dependencies

Invoke [setup-pstack](../plugins/pstack/skills/setup-pstack/SKILL.md) to choose models for each role. It detects available models, confirms the choices, and writes an override sheet. Its [runtime table](../plugins/pstack/skills/setup-pstack/SKILL.md#other-runtimes) names the sheet path and loading mechanism for each runtime. Defaults live in [models.json](../plugins/pstack/models.json).

For design comparisons and reviews, choose distinct models available to your runtime. The default panel uses different Claude models.

Install dependencies for the workflows you use:

| Dependency | When you need it |
| --- | --- |
| GitHub CLI, `gh` | PR monitoring, shipping, and the `orch` stack frontier. Authenticate with `gh auth login`. The playbooks use Origin's CLI, `origin`, instead when it can resolve the repository. |
| Bun | The bundled `watch-pr` and `orch` scripts. Their bootstrap installs script dependencies on first run. |
| `plugin-dev` | Claude Code skill-authoring guidance used by `automate-me`, `reflect`, and `poteto-mode`. |

Install the Claude Code skill-authoring companion with:

```text
/plugin marketplace add anthropics/claude-plugins-official
/plugin install plugin-dev@claude-plugins-official
```

Those authoring workflows need `plugin-dev` for their guidance; other workflows do not. Codex and GitHub Copilot use the equivalents named in their mappings: [Codex](../plugins/pstack/skills/poteto-mode/references/codex-tools.md#driver-and-bundled-skills-pstack-references) and [Copilot](../plugins/pstack/skills/poteto-mode/references/copilot-tools.md#driver-and-bundled-skills-pstack-references).

Playbooks use the runtime's task-tracking tools or an uncommitted `todo.md` checklist. For Claude Code, the repository documents `CLAUDE_CODE_ENABLE_TODO_TOOLS=1`; see [platform adaptation](../plugins/pstack/skills/poteto-mode/SKILL.md#platform-adaptation).

Use [create-verification-skill](../plugins/pstack/skills/create-verification-skill/SKILL.md) to record how the agent should run and check your project, following the [driver policy](../plugins/pstack/skills/poteto-mode/SKILL.md#non-negotiables).

## Maintenance

### Repository layout

```text
.claude-plugin/marketplace.json    Claude Code marketplace
.agents/plugins/marketplace.json  Codex marketplace
package.json                      Pi package manifest
plugins/pstack/
  .claude-plugin/plugin.json      Claude Code plugin manifest
  .codex-plugin/                  Codex manifest and generated prompt stubs
  .github/plugin/plugin.json      GitHub Copilot plugin manifest
  .muse-plugin/plugin.json        Muse native plugin manifest (skill list generated)
  pi/                            Pi extension (subagent, question, and wake-up tools)
  opencode/                      OpenCode plugin entry, agent profiles, and package manifest
  skills/                        Shared skills, references, and scripts
  agents/                        Claude Code subagent definitions (Muse agent definitions too)
  hooks/                         Startup routing for Claude Code, Codex, Copilot, and Muse; Copilot tool checks
tools/                           Generation, validation, and upstream sync
tests/                           Repository checks
```

Skills-only installs use `plugins/pstack/skills/`. Agent references and license files are included under `poteto-mode/references/`.

### Generated files and checks

The [generator](../tools/generate.mjs) updates versions, model defaults, Codex prompts, Copilot, Muse, and conditional T3 preambles and role lists, the Muse manifest's skill list, and portable reference files, and validates the Pi and OpenCode package manifests. The [slash-command table](#slash-commands) supplies the Codex prompt descriptions and order. Edit that table when changing a menu description, then regenerate. Keep a row for every public skill, with `poteto-mode` first.

[Documentation fact tests](../tests/readme-facts.test.mjs) check the skill counts and upstream pin. The table parser requires the header `| command | use it when |`.

Run the generator and repository tests with Bun:

```shell
bun install --frozen-lockfile
bun tools/generate.mjs
bun test tests/
```

The install step reads the root `bun.lock` and fetches `typebox`, which the Pi extension and its tests import.

CI also checks shell scripts, workflows, Markdown, relative links, and the bundled Bun tools. See [local checks](../CONTRIBUTING.md#things-that-will-fail-ci) for commands and [release instructions](../CONTRIBUTING.md#releasing) for versioning and the live Claude Code command check.

### Port scope and attribution

The skill tree is synced against upstream `7b353f7` (v0.15.27 and later). The thermos skills and agents are synced against `118e73b` (thermos 1.0.0).

This repository ports Lauren Tan's pstack from Cursor to Claude Code and shares the skills with other runtimes. It includes six cursor-team-kit skills, the three thermos skills with their two review subagents, and an independently authored `babysit` skill. The port supplies Claude Code plugin registration and routing, Codex manifests and shortcuts, the Codex tool mapping, the Pi package, extension, and tool mapping, the GitHub Copilot hooks and tool mapping, and the Muse native plugin, routing hook, and tool mapping, and the OpenCode plugin entry, agent profiles, and tool mapping.

Cursor-specific automations, sticky-mode metadata, the Grok Bot UI workflow, and the Cursor UI tutorial are excluded. [tools/upstream.json](../tools/upstream.json) records the revisions and exclusions, [tools/substitutions.json](../tools/substitutions.json) holds the Cursor-to-Claude rewrite rules, and [CHANGES.md](../CHANGES.md) records each release. The bundled `thermo-nuclear-code-quality-review` provides a maintainability review when a workflow calls for one, `thermo-nuclear-review` a correctness and security audit, and `thermos` runs both as parallel subagents.

For skill changes, follow the [sync boundary](../CONTRIBUTING.md#the-sync-boundary). Runtime adaptations and workflow changes both land here, and a workflow change is declared as a fork.

See the [license summary](../README.md#license) for licenses and full-plugin attribution. [NOTICE-skills.md](../NOTICE-skills.md) is the notice for skills-only installations.
